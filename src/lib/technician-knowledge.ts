/**
 * 用途：维修员特供资料库的种子数据（仅服务端使用，客户端经 API 获取）。
 * 说明：内容为校园电脑维修实操经验整理，不涉及任何真实客户信息；
 * 视频课件默认使用哔哩哔哩真实视频（videoEmbed），
 * 无网络时自动回退为内置 SVG 动画场景，保证离线可演示。
 */

/** 资料分类。 */
export const KNOWLEDGE_CATEGORIES = [
  "硬件维修",
  "系统维护",
  "网络调试",
  "数据安全",
  "视频课件",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

/** 视频课件的动画场景。art 对应前端播放器的内置 SVG 插画键名。 */
export type SceneArtKey =
  | "power-off"
  | "screwdriver"
  | "fan-clean"
  | "thermal-paste"
  | "memory-stick"
  | "bsod"
  | "network"
  | "checklist";

export interface TutorialScene {
  /** 场景标题 */
  title: string;
  /** 场景字幕 / 旁白 */
  caption: string;
  /** 内置插画键名 */
  art: SceneArtKey;
  /** 场景时长（毫秒） */
  duration: number;
}

export interface TutorialVideo {
  id: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  summary: string;
  /** 预计时长描述 */
  durationLabel: string;
  scenes: TutorialScene[];
  /** 可选：本地真实视频文件地址（放在 public/ 下，如 /videos/clean-fan.mp4） */
  videoSrc?: string;
  /** 可选：哔哩哔哩嵌入播放器地址（优先于内置动画） */
  videoEmbed?: string;
  /** 可选：哔哩哔哩原始视频页地址（用于「去 B 站观看」链接） */
  videoPage?: string;
  /** 可选：视频来源标注 */
  videoCredit?: string;
}

export interface TechnicianKnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  /** 图文资料正文（\n 分段）；视频资料为课程简介 */
  content: string;
  kind: "doc" | "video";
  /** kind 为 video 时的课件数据 */
  video?: TutorialVideo;
}

const CLEAN_FAN_VIDEO: TutorialVideo = {
  id: "video-clean-fan",
  title: "笔记本清灰与更换硅脂实操",
  category: "视频课件",
  tags: ["清灰", "散热", "硅脂", "拆机"],
  summary:
    "从断电验收、拆后盖、清理风道到涂抹硅脂的完整流程，附装机后的复测验收标准。",
  durationLabel: "9 分 31 秒",
  videoEmbed: "https://player.bilibili.com/player.html?bvid=BV19Qn5ziEZv&page=1&autoplay=0",
  videoPage: "https://www.bilibili.com/video/BV19Qn5ziEZv",
  videoCredit: "哔哩哔哩 · 废废de鱼《小白必看！手把手教会清灰换硅脂！保姆级教学！》",
  scenes: [
    {
      title: "第一步 · 断电与工具准备",
      caption: "拔掉电源适配器并长按电源键 10 秒释放余电；准备好螺丝刀、压缩空气和硅脂。",
      art: "power-off",
      duration: 6000,
    },
    {
      title: "第二步 · 拆卸后盖",
      caption: "按对角线顺序松动螺丝并分类摆放，防止混料；后盖卡扣较紧时用撬片沿缝隙缓慢划开。",
      art: "screwdriver",
      duration: 6000,
    },
    {
      title: "第三步 · 清理风道与风扇",
      caption: "压缩空气罐保持 10 厘米距离斜向吹扫散热鳍片，按住风扇叶片防止超速转动损伤轴承。",
      art: "fan-clean",
      duration: 7000,
    },
    {
      title: "第四步 · 涂抹硅脂",
      caption: "擦净旧硅脂后，在 CPU  Die 中央挤出米粒大小新硅脂，用刮片推匀薄薄一层即可。",
      art: "thermal-paste",
      duration: 6000,
    },
    {
      title: "第五步 · 装机复测",
      caption: "装回后盖按对角线拧紧，开机跑 15 分钟压力测试，记录风扇转速与表面温度后交付。",
      art: "checklist",
      duration: 6000,
    },
  ],
};

const MEMORY_VIDEO: TutorialVideo = {
  id: "video-memory",
  title: "内存条安装与故障排查",
  category: "视频课件",
  tags: ["内存", "蓝屏", "扩容", "金手指"],
  summary: "识别内存故障现象、演示内存条安装与金手指清洁，讲解替换法定位流程。",
  durationLabel: "3 分钟",
  videoEmbed: "https://player.bilibili.com/player.html?bvid=BV18t421L7oa&page=1&autoplay=0",
  videoPage: "https://www.bilibili.com/video/BV18t421L7oa",
  videoCredit: "哔哩哔哩 · 想想3c数码《笔记本电脑加内存条·内存条拆装方法》",
  scenes: [
    {
      title: "现象确认",
      caption: "随机蓝屏、开机报警或任务管理器识别不到全部内存时，优先怀疑内存接触不良。",
      art: "bsod",
      duration: 5000,
    },
    {
      title: "断电拆卸",
      caption: "断电后向两侧掰开卡扣，内存条会自动弹起 30 度，沿斜上方取出即可。",
      art: "screwdriver",
      duration: 5000,
    },
    {
      title: "清洁金手指",
      caption: "用橡皮擦沿金手指方向单擦一遍，再用压缩空气吹掉碎屑，严禁用手直接触摸。",
      art: "memory-stick",
      duration: 6000,
    },
    {
      title: "安装与验证",
      caption: "对准防呆缺口垂直下压至卡扣自动锁止；双条请优先插 2、4 槽位开启双通道。",
      art: "memory-stick",
      duration: 6000,
    },
    {
      title: "替换法定位",
      caption: "仍有故障时用已知良好的内存单条替换测试，即可区分是内存本身还是插槽问题。",
      art: "checklist",
      duration: 5000,
    },
  ],
};

const BSOD_VIDEO: TutorialVideo = {
  id: "video-bsod",
  title: "蓝屏代码采集与驱动回滚",
  category: "视频课件",
  tags: ["蓝屏", "驱动", "系统更新", "回滚"],
  summary: "教学生提供蓝屏代码、定位冲突驱动，并演示驱动回滚与更新卸载的标准流程。",
  durationLabel: "1 分 38 秒",
  videoEmbed: "https://player.bilibili.com/player.html?bvid=BV1eD4y1i7DF&page=1&autoplay=0",
  videoPage: "https://www.bilibili.com/video/BV1eD4y1i7DF",
  videoCredit: "哔哩哔哩 · HKMAC黑苹果《遇到这种蓝屏的解决方法》",
  scenes: [
    {
      title: "采集停机码",
      caption: "蓝屏瞬间用手机拍下停机码，如 0x0000007B；并在事件查看器导出最近系统错误。",
      art: "bsod",
      duration: 5500,
    },
    {
      title: "定位变更点",
      caption: "打开更新历史记录，确认蓝屏是否发生在系统更新或驱动升级之后，锁定时间窗口。",
      art: "checklist",
      duration: 5000,
    },
    {
      title: "驱动回滚",
      caption: "设备管理器中找到目标驱动，属性 → 驱动程序 → 回滚驱动程序；无回滚项则卸载后重启。",
      art: "screwdriver",
      duration: 6500,
    },
    {
      title: "稳定性验证",
      caption: "卸载问题更新后连续运行 30 分钟大型软件，观察是否复现，并建议学生开启自动保存。",
      art: "checklist",
      duration: 5000,
    },
  ],
};

const NETWORK_VIDEO: TutorialVideo = {
  id: "video-network",
  title: "校园网认证故障处理",
  category: "视频课件",
  tags: ["校园网", "Wi-Fi", "认证", "掉线"],
  summary: "按账号认证、驱动、信号干扰三层顺序排查校园网掉线与认证失败问题。",
  durationLabel: "2 分 19 秒",
  videoEmbed: "https://player.bilibili.com/player.html?bvid=BV1hUSBYtEQW&page=1&autoplay=0",
  videoPage: "https://www.bilibili.com/video/BV1hUSBYtEQW",
  videoCredit: "哔哩哔哩 · 我不是118《一期视频帮你解决99%的高校认证问题》",
  scenes: [
    {
      title: "确认账号状态",
      caption: "先登录校园网自助服务平台确认账号是否在线、是否达到终端数上限或被临时封禁。",
      art: "network",
      duration: 5000,
    },
    {
      title: "排查认证客户端",
      caption: "退出客户端重新登录，清除保存的密码；对比其他终端确认是账号问题还是本机问题。",
      art: "network",
      duration: 5500,
    },
    {
      title: "驱动与协议",
      caption: "更新无线网卡驱动，确认 WPA2/WPA3 协议与 AP 要求一致，关闭随机 MAC 地址功能。",
      art: "screwdriver",
      duration: 6000,
    },
    {
      title: "信号与复测",
      caption: "更换 5G 频段或靠近 AP 复测，用 ping 记录丢包率与延迟，形成工单维修记录。",
      art: "network",
      duration: 5000,
    },
  ],
};

/** 特供资料库种子数据：8 篇图文 + 4 个视频课件。 */
export const TECHNICIAN_KNOWLEDGE_SEED: TechnicianKnowledgeEntry[] = [
  {
    id: "doc-diagnose-flow",
    title: "维修员标准诊断流程（六步法）",
    category: "系统维护",
    tags: ["诊断", "流程", "验收", "SOP"],
    content: `第一步 · 复现与确认：让学生当面演示故障，记录发生条件（开机/特定软件/充电时），避免凭描述下单。
第二步 · 外设替换法：用已知良好的鼠标、键盘、电源适配器交叉测试，先排除外设与线材。
第三步 · 最小系统法：只保留主板、CPU、单条内存启动，判断是核心部件还是外围设备问题。
第四步 · 错误码解读：记录蓝屏停机码、BIOS 报警声或硬件检测工具报错，作为定位依据。
第五步 · 备件确认：需要换件时先查保修与备件库存，向学生说明型号、价格与保修期后再动手。
第六步 · 验收与记录：维修后做 15 分钟以上功能复测，把现象、原因、处理方式和配件信息写回工单。`,
    kind: "doc",
  },
  {
    id: "doc-heat-pipe",
    title: "散热专项：风扇异响与高温处理",
    category: "硬件维修",
    tags: ["风扇", "异响", "清灰", "温度"],
    content: `异响多数来自风扇轴承进灰或润滑油干涸，先听声辨位：持续嗡嗡多为轴承，周期性沙沙多为摩擦异物。
处理流程：断电 → 拆后盖 → 按住风扇叶片用压缩空气清灰 → 检查散热鳍片是否被灰尘堵死 → 必要时为轴承补油或更换风扇。
高温但风扇不响的场景，优先检查散热口被桌面/被褥遮挡、后台程序占用过高、硅脂老化三种原因。
验收标准：待机 CPU 温度低于 50℃，满载不超 85℃，风扇没有周期性异响，风道出风连续。`,
    kind: "doc",
  },
  {
    id: "doc-liquid-damage",
    title: "进水应急处理守则",
    category: "硬件维修",
    tags: ["进水", "断电", "应急", "主板"],
    content: `进水后第一原则是立即断电：拔掉电源适配器，长按电源键强制关机，严禁再次开机测试。
若是咖啡等含糖液体，用吸水纸吸干表面后送专业拆机清洗，糖分残留会持续腐蚀主板焊点。
进液设备必须在工单中标注「进液」，优先安排主板级维修员处理，并提醒学生数据有丢失风险。
清洗后使用洗板水加超声波清洗，烘干 2 小时以上再上电；交付前用万用表测量各供电点是否短路。`,
    kind: "doc",
  },
  {
    id: "doc-bsod-codes",
    title: "常见蓝屏停机码速查",
    category: "系统维护",
    tags: ["蓝屏", "0x0000007B", "驱动", "硬盘"],
    content: `0x0000007B INACCESSIBLE_BOOT_DEVICE：硬盘模式或存储驱动变更，进入 BIOS 检查 SATA 模式，回滚存储驱动。
0x00000050 PAGE_FAULT_IN_NONPAGED_AREA：内存或驱动缺陷，先跑内存诊断，再回滚最近安装的驱动。
0x00000124 WHEA_UNCORRECTABLE_ERROR：硬件上报致命错误，多为 CPU/内存/主板供电问题，需替换法定位。
0x000000ED UNMOUNTABLE_BOOT_VOLUME：硬盘文件系统损坏或数据线松动，先检查连接，再用 CHKDSK 修复。
收单时务必让学生提供停机码照片，能节省一半以上的现场诊断时间。`,
    kind: "doc",
  },
  {
    id: "doc-campus-network",
    title: "校园网掉线三层排查法",
    category: "网络调试",
    tags: ["校园网", "掉线", "认证", "驱动"],
    content: `第一层 账号：登录自助服务平台确认账号在线状态、终端数上限和封禁记录，必要时重新注册 MAC。
第二层 客户端：退出客户端重新登录，清除缓存密码；对比手机热点确认是否仅本机异常。
第三层 驱动与信号：更新无线网卡驱动，关闭随机 MAC，优先连接 5G 频段；用 ping 记录丢包率。
AP 侧问题表现为整片宿舍同时掉线，需联系网络中心；单点问题按上面三层处理即可闭环。`,
    kind: "doc",
  },
  {
    id: "doc-data-backup",
    title: "送修前数据安全规范",
    category: "数据安全",
    tags: ["数据", "备份", "隐私", "送修"],
    content: `涉及系统重装、硬盘更换、主板维修的工单，必须先提醒学生备份桌面、文档和浏览器收藏夹。
优先使用移动硬盘或校园云盘备份；时间紧张时至少把桌面和文档两个目录复制出来。
维修过程中不读取、不复制、不外传任何学生个人文件，确需登录账号时请学生本人操作。
硬盘报废或更换时，用 DiskGenius 做全盘擦除或物理破坏，并在工单备注中登记处置方式。`,
    kind: "doc",
  },
  {
    id: "doc-parts-stock",
    title: "常用备件与工具清单",
    category: "硬件维修",
    tags: ["备件", "工具", "库存", "硅脂"],
    content: `随身工具：精密螺丝刀套装、塑料撬片、压缩空气罐、万用表、镊子、扎带。
常备耗材：CPU 硅脂、导热垫、键盘膜、SATA 数据线、转接口、洗板水。
常备配件：常见型号内存条、2.5 英寸 SATA 固态、电源适配器、风扇模组。
备件借用与更换都要在工单登记型号与序列号，旧件贴标签交还学生，不要擅自丢弃。`,
    kind: "doc",
  },
  {
    id: "doc-acceptance",
    title: "维修验收 checklist",
    category: "系统维护",
    tags: ["验收", " checklist", "复测", "交付"],
    content: `开机验收：连续开关机三次无异常，BIOS 识别所有硬件。
功能验收：键盘、触摸板、USB、Wi-Fi、声音、摄像头逐项测试并记录结果。
性能验收：温度与风扇转速正常，磁盘 SMART 状态为良好，内存诊断通过。
资料验收：维修记录、配件型号、保修说明已写回工单，旧件已交还学生。
学生确认：向学生说明故障原因与日常保养建议，确认无误后再点「标记完成」。`,
    kind: "doc",
  },
  {
    id: CLEAN_FAN_VIDEO.id,
    title: CLEAN_FAN_VIDEO.title,
    category: CLEAN_FAN_VIDEO.category,
    tags: CLEAN_FAN_VIDEO.tags,
    content: CLEAN_FAN_VIDEO.summary,
    kind: "video",
    video: CLEAN_FAN_VIDEO,
  },
  {
    id: MEMORY_VIDEO.id,
    title: MEMORY_VIDEO.title,
    category: MEMORY_VIDEO.category,
    tags: MEMORY_VIDEO.tags,
    content: MEMORY_VIDEO.summary,
    kind: "video",
    video: MEMORY_VIDEO,
  },
  {
    id: BSOD_VIDEO.id,
    title: BSOD_VIDEO.title,
    category: BSOD_VIDEO.category,
    tags: BSOD_VIDEO.tags,
    content: BSOD_VIDEO.summary,
    kind: "video",
    video: BSOD_VIDEO,
  },
  {
    id: NETWORK_VIDEO.id,
    title: NETWORK_VIDEO.title,
    category: NETWORK_VIDEO.category,
    tags: NETWORK_VIDEO.tags,
    content: NETWORK_VIDEO.summary,
    kind: "video",
    video: NETWORK_VIDEO,
  },
];
