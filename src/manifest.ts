import { parse as parseToml } from "smol-toml";
import path from "path";
import fs from "fs";

/**
 * 包的执行方式
 *
 * 分叉点是"要不要经 yarn workspace 代理", 不是包用什么语言写的 —— 需要代理
 * 是因为依赖提升与软链归 yarn 管, 绕过它 JS 包就跑不对。其余一律"在包目录下
 * 执行声明的脚本串", poetry / cargo / docker 都是脚本串的内容, 不是新的执行方式。
 */
type PackageRunner = "yarn-workspace" | "shell";
export type { PackageRunner }

/**与语言无关的包描述 */
interface PackageManifest {
    /**包名, 菜单选项与构建顺序里用的都是它 */
    name: string;

    /**包版本 */
    version: string;

    /**包描述, 拼进菜单显示名 */
    description: string;

    /**编译顺序; -1 表示不纳入管理 */
    sequence?: number;

    /**是否是可运行的服务 */
    isServices?: boolean;

    /**是否是直接部署的静态文件 */
    isStatic?: boolean;

    /**脚本名 -> 命令 */
    scripts: Record<string, string>;

    /**包所在绝对路径 */
    dir: string;

    /**执行方式 */
    runner: PackageRunner;
}
export type { PackageManifest }

/**适配器解析结果 */
interface ManifestParsed {
    /**与语言无关的包描述 */
    manifest: PackageManifest;

    /**解析后的原始清单对象, 原样传给 scan 钩子 */
    raw: any;
}
export type { ManifestParsed }

/**清单适配器 */
interface ManifestAdapter {
    /**清单文件名 */
    file: string;

    /**
     * 解析清单
     * @return null 表示此清单不适用于该目录, 继续试下一个;
     *         抛异常表示文件在但坏了, 调用方应告警并停止在该目录继续试
     */
    parse(raw: string, dir: string): ManifestParsed | null;
}
export type { ManifestAdapter }

/**从 xlaunch 配置段里取出通用字段 */
function pickConfig(manifest: PackageManifest, conf: any) {
    if (!conf) {
        return manifest;
    }
    if (conf.name !== undefined) {
        manifest.name = conf.name;
    }
    if (conf.description !== undefined) {
        manifest.description = conf.description;
    }
    if (conf.sequence !== undefined) {
        manifest.sequence = conf.sequence;
    }
    manifest.isServices = Boolean(conf.isServices);
    manifest.isStatic = Boolean(conf.isStatic);
    if (conf.scripts) {
        manifest.scripts = conf.scripts;
    }
    return manifest;
}

/**
 * package.json
 *
 * 排在语言清单之前是刻意的: 现有带 shim 的包行为一字不变, 删掉 shim 自动切到
 * 语言清单, 给出一条零风险的迁移路径。
 */
const nodeAdapter: ManifestAdapter = {
    "file": "package.json"
    , parse(raw, dir) {
        const meta = JSON.parse(raw);
        if (!meta || !meta.name) {
            return null;
        }
        return {
            "manifest": {
                "name": meta.name
                , "version": meta.version
                , "description": meta.description
                , "sequence": meta.sequence
                , "isServices": Boolean(meta.isServices)
                , "isStatic": Boolean(meta.isStatic)
                , "scripts": meta.scripts || {}
                , "dir": dir
                , "runner": "yarn-workspace"
            }
            , "raw": meta
        };
    }
};

/**
 * pyproject.toml
 *
 * 元数据取 [project], xlaunch 配置取 [tool.xlaunch] —— 后者是 PEP 518 官方
 * 留给第三方工具的位置, 所以版本号只有一份, 不存在双写。
 */
const pythonAdapter: ManifestAdapter = {
    "file": "pyproject.toml"
    , parse(raw, dir) {
        const doc: any = parseToml(raw);
        const project = doc.project || {};
        const conf = doc.tool && doc.tool.xlaunch;
        if (!project.name && !(conf && conf.name)) {
            return null;
        }
        return {
            "manifest": pickConfig({
                "name": project.name
                , "version": project.version
                , "description": project.description || ""
                , "scripts": {}
                , "dir": dir
                , "runner": "shell"
            }, conf)
            , "raw": doc
        };
    }
};

/**
 * Cargo.toml
 *
 * 元数据取 [package], xlaunch 配置取 [package.metadata.xlaunch] —— Cargo Book
 * 官方留给第三方工具的位置。
 *
 * workspace 根目录只有 [workspace] 没有 [package], 这里返回 null, 由调用方
 * 报"找到清单但无法识别", 不在此特判。
 */
const rustAdapter: ManifestAdapter = {
    "file": "Cargo.toml"
    , parse(raw, dir) {
        const doc: any = parseToml(raw);
        const pkg = doc.package;
        if (!pkg || !pkg.name) {
            return null;
        }
        const conf = pkg.metadata && pkg.metadata.xlaunch;
        return {
            "manifest": pickConfig({
                "name": pkg.name
                , "version": pkg.version
                , "description": pkg.description || ""
                , "scripts": {}
                , "dir": dir
                , "runner": "shell"
            }, conf)
            , "raw": doc
        };
    }
};

/**内置适配器, 顺序即优先级 */
const ADAPTERS: ManifestAdapter[] = [
    nodeAdapter
    , pythonAdapter
    , rustAdapter
];
export { ADAPTERS, nodeAdapter, pythonAdapter, rustAdapter }

/**目录清单解析结果 */
interface ResolveResult {
    /**解析成功时的结果 */
    parsed?: ManifestParsed;

    /**该目录下存在的清单文件名 */
    found: string[];

    /**解析失败时的异常 */
    error?: Error;

    /**解析失败的清单文件名 */
    errorFile?: string;
}

/**
 * 在一个目录里按优先级找出第一个可用清单
 *
 * 三种结果, 调用方区别对待:
 * - parsed 有值: 识别成功
 * - found 为空: 一个清单文件都没有, 大概率不是包目录, 适合收敛成汇总告警
 * - found 非空但 parsed 为空: 文件在却读不出来, 是可操作的错误, 应逐个报
 */
function resolveManifest(dir: string): ResolveResult {
    const found: string[] = [];

    for (const adapter of ADAPTERS) {
        const file = path.join(dir, adapter.file);
        if (!fs.existsSync(file)) {
            continue;
        }
        found.push(adapter.file);
        try {
            const parsed = adapter.parse(fs.readFileSync(file, "utf8"), dir);
            if (parsed) {
                return { parsed, found };
            }
        } catch (e) {
            // 文件在但坏了。不能悄悄降级去读下一个清单, 否则用户会面对一个
            // 来路不明的菜单项
            return { found, "error": e, "errorFile": adapter.file };
        }
    }

    return { found };
}
export { resolveManifest }
