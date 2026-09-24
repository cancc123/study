"use strict";
/* ================= 启程日（自定义，存本机） ================= */
var SKEY="danzhao_p1_start_v1";
function pad2(x){return (x<10?"0":"")+x;}
function ymd(d){return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function parseYmd(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
var START=parseYmd(localStorage.getItem(SKEY))||new Date(2026,8,9);

var SB=["数","英","政","语"];
function fd(n){var t=new Date(START.getTime()+(n-1)*86400000);var m=t.getMonth()+1,dd=t.getDate();return (m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd;}
function fdF(n){return new Date(START.getTime()+(n-1)*86400000).getFullYear()+"-"+fd(n);}
var DW=["周日","周一","周二","周三","周四","周五","周六"];
function dow(n){var t=new Date(START.getTime()+(n-1)*86400000);return DW[t.getDay()];}

function wk(n,label,days,opts){
  var o=opts||{};
  return {n:n,label:label,vocab:o.vocab||null,focus:o.focus||null,
    first:days[0].d,last:days[days.length-1].d,days:days};
}
function day(n,t){return {d:n,tasks:t};}
function sun(n,items,test){return {d:n,sun:true,items:items,test:test};}

/* ================= 第一阶段数据 ================= */
var P1=[
{no:"1.1",name:"筑基起步",range:"Day 1–28",weeks:[
wk(1,"第 1 周",[
  day(1,["柏木衔接篇：数轴与绝对值概念，例题跟做 10 题","词汇手册第 1–30 词跟读 + 标注词性","柏木必修 1 目录通览，画出全书框架","柏木语文目录通览 + 作文素材本开立（体育亲历素材 5 条）"]),
  day(2,["绝对值与相反数化简 15 题","词汇手册第 31–60 词 + 高频词组 10 个","第一课框题预习 + 核心概念抄记 10 个","易错字音总表通读 20 词 + 每日一词习惯开立"]),
  day(3,["有理数与整式运算 15 题","五大基本句型，各造 2 句","必修 1 第一课（上）精读划关键词","字音 A 组 20 词 + 病句六类型通览"]),
  day(4,["因式分解：提公因式 + 公式法 15 题","名词单复数与冠词 20 题","第一课（下）+ 填空自测","字形 20 组 + 成语第 1 批 10 个"]),
  sun(5,["数学基础 10 题 + 英语 60 词滚动测验（过关 80%）","晚上政治第一课背诵 30 分钟","15:00 起强制休整"]),
  day(6,["十字相乘法 + 分式化简 15 题","代词 20 题","必修 1 第二课（上）","成语 11–20 并造句"]),
  day(7,["一元二次方程两种解法 12 题","形容词副词比较级 20 题","第二课（下）+ 填空自测","病句 1：语序不当 + 搭配不当"])
],{vocab:"单词第 1–90 个（Day 1–2 含音标复习）"}),
wk(2,"第 2 周",[
  day(8,["判别式 + 韦达定理 12 题","时态 1：一般现在 / 过去 25 题","必修 1 第三课（上）","病句 2：残缺 + 杂糅各 5 例"]),
  day(9,["一元一次不等式与数轴 15 题","时态 2：进行 / 将来 25 题","第三课（下）","标点易错 8 类 20 题"]),
  day(10,["集合的概念与表示 15 题","时态 3：现在完成时 25 题","第四课（上）","病句综合 15 题（限时 25 分钟）"]),
  day(11,["集合关系与交并补 15 题","情态动词 20 题","第四课（下），第一遍完成","文常 1：先秦至唐宋 20 条"]),
  sun(12,["柏木配套卷：数学 + 英语各 60 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 1"),
  day(13,["集合运算综合 20 题（限时 40 分钟）","被动语态 25 题","第二遍：第一、二课","文常 2：元明清至近代 20 条"]),
  day(14,["函数概念：定义域值域 15 题","句型转换 20 题","第二遍：第三、四课","字音字形成语总测 50 词"])
],{vocab:"单词第 91–210 个 + 必修 1 当日课关键词背诵 15 分钟"}),
wk(3,"第 3 周",[
  day(15,["函数表示法与映射 12 题","宾语从句 20 题","全书关键词填空 60 空","说明文 1：信息筛选"]),
  day(16,["函数单调性 12 题","状语从句：时间 / 条件 20 题","时间线一页纸（四种社会形态）","说明文 2：选项比对法"]),
  day(17,["函数奇偶性 12 题","状语从句：原因 / 结果 / 让步 20 题","背诵卡制作：第一、二课","议论文 1：找中心论点"]),
  day(18,["二次函数图像与顶点 12 题","三大从句综合 30 题（限时 35 分钟）","背诵卡制作：第三、四课","议论文 2：论证方法"]),
  sun(19,["柏木配套小卷：语文 40 分钟 + 政治默写 40 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 2"),
  day(20,["二次函数最值应用 10 题","定语从句入门 20 题","背诵卡一轮：第一、二课","修辞手法 8 种"]),
  day(21,["简易逻辑：命题与量词 12 题","定语从句练习 2 共 20 题","背诵卡一轮：第三、四课","阅读综合 2 篇限时"])
],{vocab:"单词第 211–330 个 + 必修 1 背诵卡推进"}),
wk(4,"第 4 周",[
  day(22,["集合与函数单元卷（60 分钟限时）","阅读理解 1 篇（8 分钟 + 精读 20 分钟）","全书关键词串联一轮","字音字形成语错题重做"]),
  day(23,["单元卷讲评 + 错题归档","阅读 2 篇","选择题自测 30 题","文常 + 修辞总复习"]),
  day(24,["初中衔接错题回炉到全对","阶段词汇总测 1–300（过关 90%）","自测讲评 + 错题登记","现代文综合 2 篇"]),
  day(25,["综合练习 30 题（限时 70 分钟）","语法综合 40 题（限时 45 分钟）","时政题型认知：看 10 道真题","病句 + 标点综合 20 题"]),
  sun(26,["阶段一月考：四科全真限时","上午语文（9:00）+ 数学（10:45）","下午政治（14:00）+ 英语（15:45）","晚上只批卷不分析"],"月考"),
  day(27,["月考讲评：错题归档","讲评：题型丢分统计","讲评：背诵缺口清单","讲评：丢分模块统计"]),
  day(28,["写出已掌握 + 漏洞清单","词汇进度核对 + 弱语法清单","必修 1 背诵总验收","与 Day 1 对比写进步清单"])
],{vocab:"单词第 331–450 个 + 必修 1 全书滚动背诵；国庆放假则训练时段转机动复习"})
]},
{no:"1.2",name:"基础强化",range:"Day 29–70",weeks:[
wk(5,"第 5 周",[
  day(29,["指数运算法则","定语从句收尾练习 25 题","必修 2 第一课（上）","议论文：论据分析"]),
  day(30,["幂运算与化简 15 题","三大从句综合 25 题","第一课（下）+ 填空","逻辑关系词专项"]),
  day(31,["指数函数概念与图像","阅读 2 篇","第一课背诵","说明文：图表信息"]),
  day(32,["指数函数性质应用 15 题","非谓语入门：不定式","滚动复习必修 1","散文阅读 1"]),
  sun(33,["词汇周测（1–600 抽样 80 词）","政治第一课背诵验收","15:00 起强制休整"]),
  day(34,["指数函数综合练习","阅读 2 篇 + 单词复查","必修 2 背诵强化","散文阅读 2"]),
  day(35,["本周错题回炉","复盘 + 错题登记","柏木配套卷 20 题","综合练习 + 复盘"])
],{vocab:"单词第 451–600 个（每日约 25 个新词）+ 必修 2 关键词背诵"}),
wk(6,"第 6 周",[
  day(36,["对数的概念与运算法则","阅读专练 2 篇","必修 2 第二课（上）","说明文：图表比对专项"]),
  day(37,["对数运算练习 15 题","阅读 2 篇限时","第二课（下）","现代文综合 1 篇"]),
  day(38,["对数函数概念与图像","非谓语：动名词","第二课填空 + 背诵","说明文综合 2 篇"]),
  day(39,["对数函数性质 15 题","动名词练习 25 题","滚动复习","阅读错题归档"]),
  sun(40,["柏木配套卷：数学 + 英语各 60 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 3"),
  day(41,["指对函数综合练习","阅读 2 篇","第二课背诵验收","议论文 1 篇"]),
  day(42,["本周错题回炉","复盘","柏木配套卷","复盘"])
],{vocab:"单词第 601–750 个"}),
wk(7,"第 7 周",[
  day(43,["函数零点与二分法","不定式 vs 动名词辨析 20 题","必修 2 第三课（上）","散文：情感主旨 1"]),
  day(44,["零点判断练习 15 题","阅读 2 篇","第三课（下）","散文 2"]),
  day(45,["函数应用综合","非谓语综合 25 题","第三课背诵","散文 3"]),
  day(46,["导数概念与求导公式（幂/指/对）15 题","阅读 2 篇","滚动复习","现代文综合 1 篇限时"]),
  sun(47,["周复盘 + 词汇周测（本周段）","政治背诵验收","15:00 起强制休整"]),
  day(48,["导数求单调性与切线基础 12 题 + 错题回炉","阅读 2 篇","背诵验收","综合 2 篇"]),
  day(49,["柏木单元卷（函数+导数）60 分钟","复盘","柏木配套卷","复盘"])
],{vocab:"单词第 751–900 个"}),
wk(8,"第 8 周",[
  day(50,["等差数列通项公式","动名词综合 25 题","必修 2 第四课（上）","现代文综合 2 篇限时"]),
  day(51,["等差数列前 n 项和","阅读 2 篇","第四课（下）","阅读错题归类"]),
  day(52,["等差数列练习 15 题","阅读 2 篇","第四课背诵","说明文 + 散文各 1 篇"]),
  day(53,["等差综合应用","时态从句混合 50 题","必修 2 全书一页纸框架","现代文综合第 3 篇"]),
  sun(54,["柏木配套卷：语文 + 政治各 60 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 4"),
  day(55,["错题回炉","阅读 2 篇","必修 2 全书背诵验收","现代文综合第 4 篇"]),
  day(56,["周综合练","复盘","柏木配套卷","复盘"])
],{vocab:"单词第 901–1050 个"}),
wk(9,"第 9 周",[
  day(57,["等比数列通项","完形入门 1 篇（精读式）","必修 3 第一课（上）","现代文综合 2 篇"]),
  day(58,["等比前 n 项和","完形入门 1 篇","第一课（下）","现代文 2 篇"]),
  day(59,["等比练习 15 题","阅读 2 篇限时","第一课背诵","错题回炉"]),
  day(60,["等差等比综合","词汇中段自查 60 词","填空自测","方法总结卡 1：说明文"]),
  sun(61,["词汇周测（1–1200 抽样 100 词）","政治背诵验收","15:00 起强制休整"]),
  day(62,["数列综合 20 题","阅读 2 篇","滚动复习","总结卡 2：议论文"]),
  day(63,["错题回炉","复盘","柏木配套卷","总结卡 3：散文"])
],{vocab:"单词第 1051–1200 个"}),
wk(10,"第 10 周",[
  day(64,["柏木数列单元卷 60 分钟","阅读专练 2 篇","必修 3 第二课（上）","阅读保持 2 篇"]),
  day(65,["单元卷讲评","阅读 2 篇","第二课（下）","错题归档"]),
  day(66,["数列应用题专练","完形 1 篇","第二课背诵","总结卡 4：综合"]),
  day(67,["错题回炉","阅读 2 篇","滚动复习","四张总结卡通读"]),
  sun(68,["阶段二全科测试（柏木模拟卷，全真限时）","目标 220–240，晚上只批卷","对照丢分清单"],"阶段测试"),
  day(69,["讲评 + 漏洞清单","讲评 + 丢分统计","讲评 + 背诵缺口","讲评 + 弱项清单"]),
  day(70,["阶段二总结","词汇进度核对（1350 词）","必修 1–2 框架复述","阅读方法固化"])
],{vocab:"单词第 1201–1350 个"})
]},
{no:"1.3",name:"系统进阶",range:"Day 71–105",weeks:[
wk(11,"第 11 周",[
  day(71,["三角函数定义与符号","非谓语综合 30 题","必修 3 第三课（上）","文言实词卡片 1–15"]),
  day(72,["同角基本关系式 15 题","完形 1 篇","第三课（下）","实词卡片 16–30"]),
  day(73,["同角关系练习","阅读 2 篇","第三课背诵","实词 30 自测"]),
  day(74,["综合练习","完形 1 篇","填空自测","虚词：之、其"]),
  sun(75,["柏木配套卷：数学 + 英语各 60 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 5"),
  day(76,["错题回炉","阅读 2 篇","滚动复习","虚词练习 20 题"]),
  day(77,["周综合","复盘","柏木配套卷","复盘"])
],{vocab:"单词第 1351–1500 个"}),
wk(12,"第 12 周",[
  day(78,["诱导公式","完形 1 篇精读","必修 3 第四课（上）","实词 31–60（卡片）"]),
  day(79,["诱导公式练习 15 题","完形 1 篇","第四课（下）","虚词：而、以"]),
  day(80,["正弦函数图像与性质","阅读 2 篇","第四课背诵","虚词：于、为"]),
  day(81,["余弦函数图像","单词拼写入门 20 词","全书框架复述","句式：判断 / 被动"]),
  sun(82,["周复盘 + 词汇周测（本周段）","政治滚动背诵","15:00 起强制休整"]),
  day(83,["图像性质练习","完形 1 篇","必修 3 全书背诵验收","句式：省略 + 翻译入门"]),
  day(84,["错题回炉","复盘","柏木配套卷","文言小段精读 1"])
],{vocab:"单词第 1501–1650 个"}),
wk(13,"第 13 周",[
  day(85,["两角和差公式","完形 1 篇","错题滚动","文言翻译：直译五字法"]),
  day(86,["和差公式练习 15 题","阅读 2 篇","必修 3 查漏背诵","翻译练习 5 句"]),
  day(87,["三角恒等变换：辅助角 + 二倍角基础题","拼写 20 词","综合自测 30 题","文言小段精读 2"]),
  day(88,["综合练习","完形 1 篇","错题登记","句式综合 20 题"]),
  sun(89,["柏木配套卷：语文 + 政治各 60 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 6"),
  day(90,["柏木三角单元卷 60 分钟","阅读 2 篇","讲评","讲评"]),
  day(91,["错题回炉","复盘","复盘","复盘"])
],{vocab:"单词第 1651–1800 个"}),
wk(14,"第 14 周",[
  day(92,["平面向量线性运算","完形 1 篇","必修 4 第一课（上）","文言翻译巩固"]),
  day(93,["向量坐标运算","阅读 2 篇","第一课（下）","文言小段精读 3"]),
  day(94,["向量数量积","拼写 20 词","第二课（上）","翻译练习 5 句"]),
  day(95,["数量积练习 15 题","完形 1 篇","第二课（下）","实词虚词总复习"]),
  sun(96,["词汇周测（1801–1950）","政治背诵验收","15:00 起强制休整"]),
  day(97,["向量综合","阅读 2 篇","第一、二课背诵","文言综合 2 段"]),
  day(98,["错题回炉","复盘","柏木配套卷","复盘"])
],{vocab:"单词第 1801–1950 个"}),
wk(15,"第 15 周",[
  day(99,["解三角形：正弦定理与面积公式","书面表达模板 1：三段式","必修 4 第三课（上）","文言精读每日一小段启动"]),
  day(100,["余弦定理","模板 1 默写","第三课（下）","文言小段精读"]),
  day(101,["解三角形应用题","完形 1 篇","第三课背诵","文言小段精读"]),
  day(102,["柏木三角单元卷 60 分钟","阅读 2 篇","第四课（上）","文言小段精读"]),
  sun(103,["阶段三全科测试（柏木模拟卷，全真限时）","目标 250–270，晚上只批卷","词汇 2000 词全部完成核对"],"阶段测试"),
  day(104,["讲评","讲评","第四课（下）","讲评"]),
  day(105,["错题归档","词汇 2000 核对","第三、四课背诵","文言错题总复习"])
],{vocab:"单词第 1951–2000 个，词汇全书一轮复习启动"})
]},
{no:"1.4",name:"整合与真题一刷",range:"Day 106–130",weeks:[
wk(16,"第 16 周",[
  day(106,["直线方程五种形式","书面表达模板 2","必修 4 背诵第 1 轮","作文审题立意专练"]),
  day(107,["直线位置关系与距离","高频拼写 100 词（第 1 批）","唯物论背诵","素材库 1：体育精神 3 例"]),
  day(108,["圆的方程","模板 2 默写","辩证法：联系发展","议论文全文 1 篇（第 1 篇）"]),
  day(109,["直线与圆综合 15 题","阅读保持 2 篇","认识论 + 历史唯物主义","素材卡整理"]),
  sun(110,["柏木配套卷：数学 + 英语各 60 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 7"),
  day(111,["错题回炉","讲评","文化模块背诵","讲评 + 作文修改"]),
  day(112,["周综合","复盘","一轮自测","复盘"])
],{vocab:"词汇一轮滚动复习（1–1000）"}),
wk(17,"第 17 周",[
  day(113,["椭圆定义与标准方程","书面表达模板 3","必修 4 二轮背诵","素材库 2：青春奋斗 / 责任担当"]),
  day(114,["椭圆基础题（只做选填）","模板 3 默写","元旦休整半天","元旦休整半天"]),
  day(115,["立体几何：线面关系（选填技巧）","阅读 2 篇","时政 10 条（11 月）","议论文全文 1 篇（第 2 篇）"]),
  day(116,["立体选填专练 15 题","完形 1 篇","时政 10 条（12 月）","素材卡背诵"]),
  sun(117,["柏木四科小卷各 45 分钟","讲评 + 错题登记","15:00 起强制休整"],"双周测 8"),
  day(118,["概率：古典概型","讲评","讲评","讲评"]),
  day(119,["排列组合基础","阅读 2 篇","四本框架复述","文言综合 1 段"])
],{vocab:"词汇一轮滚动复习（1001–2000）"}),
wk(18,"第 18 周",[
  day(120,["古典概型练习 15 题","阅读 + 完形综合","思维导图：必修 1","文言综合"]),
  day(121,["排列组合与概率综合","阅读 2 篇","思维导图：必修 2","议论文全文 1 篇（第 3 篇）"]),
  day(122,["概率选填专练","完形 1 篇","思维导图：必修 3","错题回炉"]),
  day(123,["立几 + 概率综合 20 题","复盘","思维导图：必修 4","复盘"]),
  sun(124,["真题试做：语文 + 数学各一套（不限时）","逐题研究出题套路","真题错题摘录"],"真题试做"),
  day(125,["真题错题分析","真题词汇摘录","思维导图总复述","真题题型归纳"]),
  day(126,["漏洞回炉","词汇查漏","背诵滚动","方法卡通读"])
],{vocab:"词汇二轮复习：高频词优先"}),
wk(19,"收尾 4 天",[
  day(127,["真题一刷：英语卷（不限时）","逐题精读，不留疑问","真题一刷：政治卷（晚间）","真题一刷：语文卷（晚间）"]),
  day(128,["真题一刷：数学卷（不限时）","四科错题逐题归档","真题词汇与题型摘录","作文模板默写自查"]),
  day(129,["四科讲评：错因分析（不会 / 马虎 / 时间）","错题按知识点归类","政治问答模板核对","文言错题清单"]),
  day(130,["阶段总结：掌握清单 + 漏洞清单","词汇 2000 终核对","四本框架总复述","冲刺期安排确认"])
])
]}
];

/* ================= 第二阶段数据 ================= */
var P2=[
{no:"2.1",name:"全真模考与真题二刷",range:"Day 131–138",weeks:[
wk(20,"冲刺第 1 周",[
  sun(131,["全真模考：2025 年真题四科（上午语数 / 下午政英）","严格计时、涂卡、不查资料","晚上批改 90 分钟 + 分数登记"],"全真模考"),
  day(132,["真题二刷：语文卷（上午限时）","下午：逐题研究答案与出题套路","晚：错题归档（错因 / 知识点 / 解法）"]),
  day(133,["真题二刷：数学卷","下午：错题整理 + 选填正确率统计","晚：错题本登记（红笔标连续错两次）"]),
  day(134,["真题二刷：政治卷","下午：错题整理 + 问答模板核对","晚：错题本登记"]),
  day(135,["真题二刷：英语卷","下午：错题整理 + 阅读错题归类","晚：错题本登记"]),
  day(136,["真题二刷：语文卷（第二套）","下午：错题整理","晚：错题本登记"]),
  day(137,["真题二刷：数学卷（第二套）","下午：错题整理","晚：错题本登记"]),
  sun(138,["错题本总复盘：标星题重做","下午休整"])
],{focus:"每日晚 20:30 错题本登记与单词滚动复习（坚持 6 天以上）"})
]},
{no:"2.2",name:"限时成套真题",range:"Day 139–145",weeks:[
wk(21,"冲刺第 2 周",[
  day(139,["限时套题一：上午语文 + 下午数学（严格计时）","晚上快速批改"]),
  day(140,["限时套题一：上午政治 + 下午英语","晚上批改 + 四科丢分登记"]),
  day(141,["套题一讲评（每科 90 分钟）","数学选填统计：目标选择 5/8、填空 2/4","晚上错题归档"]),
  day(142,["限时套题二：上午语文 + 下午数学","晚上快速批改"]),
  day(143,["限时套题二：上午政治 + 下午英语","晚上批改 + 丢分登记"]),
  day(144,["套题二讲评","错题本一轮回顾：遮住答案重做，做对划掉仍错标星"]),
  sun(145,["错题一轮回顾收尾","时政 30 条开始第一遍背诵","下午休整"])
],{focus:"每日晚错题本回顾 + 数学选填正确率曲线登记"})
]},
{no:"2.3",name:"薄弱强化与时政突击",range:"Day 146–152",weeks:[
wk(22,"冲刺第 3 周",[
  day(146,["语文薄弱专项 2 小时（按模考数据：文言文或现代文）","时政 5 条 + 单词滚动 30 分钟"]),
  day(147,["数学薄弱专项 2 小时（导数 / 概率 / 数列选填）","时政 5 条 + 单词滚动 30 分钟"]),
  day(148,["英语薄弱专项 2 小时（完形精读 2 篇）","时政 5 条 + 单词滚动 30 分钟"]),
  day(149,["政治薄弱专项 2 小时（问答模板默写 5 道）","时政 5 条 + 单词滚动 30 分钟"]),
  day(150,["数学薄弱专项二：弱模块选填 25 题","时政 5 条 + 单词滚动 30 分钟"]),
  day(151,["作文模板成文 3 篇全部默写达标","时政 5 条 + 单词滚动 30 分钟"]),
  sun(152,["时政 30 条总测（过关 90%）","标星错题回顾","下午休整"])
],{focus:"每天早晚各过一遍时政 5 条，周日前累计 30 条"})
]},
{no:"2.4",name:"全真模拟与考前调整",range:"Day 153–160",weeks:[
wk(23,"冲刺第 4 周",[
  day(153,["全真模拟一：上午语文 + 下午数学","晚上批改 + 复盘 90 分钟"]),
  day(154,["全真模拟一：上午政治 + 下午英语","晚上批改 + 复盘 90 分钟"]),
  day(155,["模拟一讲评 + 最后补漏（每个薄弱点 3 题验证）","错题本二轮：只看标星题"]),
  day(156,["全真模拟二：上午语文 + 下午数学","晚上批改 + 复盘"]),
  day(157,["全真模拟二：上午政治 + 下午英语","晚上批改 + 复盘"]),
  day(158,["模拟二讲评 + 高频考点速览","错题本最后过一遍"]),
  sun(159,["全真模拟三：最后一次，目标 ≥300","晚上只批卷不复盘，早睡"],"全真模拟三"),
  day(160,["考前调整：不做新题","翻错题本、框架图、作文模板、时政表","按考试时间调整作息，轻度运动放松"])
],{focus:"模拟日严格按 3 月考试时间作息，晚 22:30 前睡"})
]}
];

var PHASES=[
 {no:"PHASE 1",name:"第一阶段 · 系统学习",range:"Day 1–130",subs:P1},
 {no:"PHASE 2",name:"第二阶段 · 冲刺复习",range:"Day 131–160",subs:P2}
];
PHASES.forEach(function(ph){
  ph.subs.forEach(function(sb){
    var w0=sb.weeks[0],wN=sb.weeks[sb.weeks.length-1];
    sb.first=w0.days[0].d;sb.last=wN.days[wN.days.length-1].d;
  });
  var s0=ph.subs[0],sN=ph.subs[ph.subs.length-1];
  var wN=sN.weeks[sN.weeks.length-1];
  ph.first=s0.weeks[0].days[0].d;ph.last=wN.days[wN.days.length-1].d;
});

/* ================= 渲染 ================= */
var KEY="danzhao_p1_check_v1";
var state={};
try{state=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){state={};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
  if(ME)scheduleSync();}
var app=document.getElementById("app");
var weekCounts=[],subCounts=[],phaseCounts=[],weekRefs=[],todayRef=null;
var ovChips=[],subMeta=[],todayN=null;

function checkbox(id,text){
  var li=document.createElement("li");
  li.className="t";
  li.innerHTML='<input type="checkbox" id="'+id+'"'+(state[id]?" checked":"")+'><span class="tx">'+text+'</span>';
  var inp=li.querySelector("input");
  inp.addEventListener("change",function(){
    if(this.checked)state[id]=1;else delete state[id];
    save();refresh();
  });
  li.addEventListener("click",function(e){
    if(e.target===inp)return;
    inp.click();
  });
  return {li:li,inp:inp};
}

function renderAll(){
  weekCounts=[];subCounts=[];phaseCounts=[];weekRefs=[];todayRef=null;
  ovChips=[];subMeta=[];todayN=null;
  app.innerHTML="";
PHASES.forEach(function(ph,pi){
  var dPh=document.createElement("details");
  dPh.className="phase";dPh.open=(pi===0);
  var sPh=document.createElement("summary");
  sPh.innerHTML='<span class="chev">▶</span><span class="ph-no">'+ph.no+'</span>'
    +'<span class="ph-name">'+ph.name+'</span><span class="ph-range">'+ph.range+' · '+fdF(ph.first)+' 至 '+fdF(ph.last)+'</span>'
    +'<span class="cnt"><span class="bar"><i></i></span><span class="tx"></span></span>';
  dPh.appendChild(sPh);
  var body=document.createElement("div");body.className="ph-body";
  var phInps=[];
  ph.subs.forEach(function(sb,si){
    var dSb=document.createElement("details");
    dSb.className="sub";dSb.open=(pi===0&&si===0);
    var sSb=document.createElement("summary");
    sSb.innerHTML='<span class="chev">▶</span><span class="sub-no">'+sb.no+'</span>'
      +'<span class="sub-name">'+sb.name+'</span><span class="sub-range">'+sb.range+' · '+fd(sb.first)+' 至 '+fd(sb.last)+'</span>'
      +'<span class="cnt"><span class="bar"><i></i></span><span class="tx"></span></span>';
    dSb.appendChild(sSb);
    var sbBody=document.createElement("div");sbBody.className="sub-body";
    var sbInps=[];
    sb.weeks.forEach(function(w,wi){
      var dW=document.createElement("details");
      dW.className="week";dW.open=(pi===0&&si===0&&wi===0);
      var sW=document.createElement("summary");
      var vm=w.vocab?w.vocab.match(/(\d+–\d+)/):null;
      var chip=vm?'<span class="wchip">词 '+vm[1]+'</span>':'';
      sW.innerHTML='<span class="chev">▶</span><span class="wk">W'+(w.n<10?"0":"")+w.n+'</span>'
        +'<span class="wdate">'+w.label+'</span>'+chip
        +'<span class="wdays">'+fd(w.first)+' 至 '+fd(w.last)+' · Day '+w.first+'–'+w.last+'</span>'
        +'<span class="cnt"><span class="bar"><i></i></span><span class="tx"></span></span>';
      dW.appendChild(sW);
      var wInps=[];
      var wkBody=document.createElement("div");wkBody.className="wk-body";
      if(w.vocab||w.focus){
        var rd=document.createElement("div");rd.className="reading";
        var cb=checkbox("w"+w.n+"-rd",(w.vocab?"早读任务（每日 60 分钟，本周至少 5 天）："+w.vocab:"本周纪律："+w.focus));
        rd.appendChild(cb.li);wInps.push(cb.inp);
        wkBody.appendChild(rd);
      }
      w.days.forEach(function(dy){
        var card=document.createElement("div");
        card.className="daycard"+(dy.sun?" sun":"")+(dy.test?" test":"");
        card.setAttribute("data-day",dy.d);
        var head=document.createElement("div");head.className="dc-head";
        head.innerHTML='<span class="dc-no">Day '+dy.d+'</span><span class="dc-date">'+dow(dy.d)+" "+fd(dy.d)+'</span>';
        if(dy.test){var p=document.createElement("span");p.className="pill";p.textContent=dy.test;head.appendChild(p);}
        var ul=document.createElement("ul");ul.className="ts";
        var list=dy.tasks?dy.tasks.map(function(t,i){return {t:t,cls:"",sb:SB[i]};})
                         :dy.items.map(function(t){return {t:t,cls:"",sb:null};});
        list.forEach(function(it,j){
          var cb=checkbox("w"+w.n+"-d"+dy.d+"-"+j,it.t);
          if(it.sb){var s=document.createElement("span");s.className="sbj";s.textContent=it.sb;cb.li.insertBefore(s,cb.li.firstChild);}
          ul.appendChild(cb.li);wInps.push(cb.inp);
        });
        card.appendChild(head);card.appendChild(ul);
        wkBody.appendChild(card);
      });
      dW.appendChild(wkBody);
      sbBody.appendChild(dW);
      weekCounts.push({cnt:sW.querySelector(".cnt .tx"),bar:sW.querySelector(".cnt .bar i"),inps:wInps});
      weekRefs.push({n:w.n,first:w.first,last:w.last,weekEl:dW,subEl:dSb,phEl:dPh});
      sbInps=sbInps.concat(wInps);
    });
    dSb.appendChild(sbBody);
    body.appendChild(dSb);
    subCounts.push({cnt:sSb.querySelector(".cnt .tx"),bar:sSb.querySelector(".cnt .bar i"),inps:sbInps});
    subMeta.push({pi:pi,si:si,dPh:dPh,dSb:dSb});
    phInps=phInps.concat(sbInps);
  });
  dPh.appendChild(body);
  app.appendChild(dPh);
  phaseCounts.push({cnt:sPh.querySelector(".cnt .tx"),bar:sPh.querySelector(".cnt .bar i"),inps:phInps});
});
  renderOverview();
  renderOverviewNow();
  refresh();
  locateToday();
  syncChrome();
}

/* ================= 全局进度预览（顶栏下方，可跳转） ================= */
function dayOffset(){
  var now=new Date();
  return Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-START)/86400000)+1;
}
function flash(row){
  row.classList.remove("flash");void row.offsetWidth;row.classList.add("flash");
  setTimeout(function(){row.classList.remove("flash");},320);
}
function jumpToDay(tday){
  var row=app.querySelector('.daycard[data-day="'+tday+'"]');
  if(!row)return;
  var smooth=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(todayRef){todayRef.phEl.open=true;todayRef.subEl.open=true;todayRef.weekEl.open=true;}
  row.scrollIntoView({behavior:smooth?"smooth":"auto",block:"center"});
  flash(row);
}
function renderOverview(){
  var wrap=document.getElementById("ovStrip");
  wrap.innerHTML="";ovChips=[];
  var tday=dayOffset();
  var smooth=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur=null;
  subMeta.forEach(function(m,idx){
    var ph=PHASES[m.pi],sb=ph.subs[m.si];
    if(!cur||cur.pi!==m.pi){
      var g=document.createElement("div");g.className="ov-group";
      var lab=document.createElement("div");lab.className="ov-glabel";
      lab.textContent=ph.no+" · "+ph.name.split("·")[1].trim()+" · "+ph.range;
      var strip=document.createElement("div");strip.className="ov-strip";
      g.appendChild(lab);g.appendChild(strip);
      wrap.appendChild(g);
      cur={pi:m.pi,strip:strip};
    }
    var b=document.createElement("button");
    b.type="button";b.className="ov-chip";
    b.innerHTML='<span class="no">'+sb.no+'<span class="nowdot"> · 今天</span></span>'
      +'<span class="nm">'+sb.name+'</span>'
      +'<span class="meta"><span class="obar"><i></i></span><span class="onum">0 / 0</span></span>';
    if(tday>=sb.first&&tday<=sb.last)b.classList.add("cur");
    b.addEventListener("click",function(){
      m.dPh.open=true;m.dSb.open=true;
      m.dSb.scrollIntoView({behavior:smooth?"smooth":"auto",block:"start"});
    });
    ovChips.push({chip:b,num:b.querySelector(".onum"),bar:b.querySelector(".obar i"),inps:subCounts[idx].inps});
    cur.strip.appendChild(b);
  });
}
function renderOverviewNow(){
  var el=document.getElementById("ovNow");
  var tday=dayOffset();
  if(tday>=1&&tday<=160){
    var loc=null;
    for(var pi=0;pi<PHASES.length&&!loc;pi++){
      var ph=PHASES[pi];
      for(var si=0;si<ph.subs.length&&!loc;si++){
        var sub=ph.subs[si];
        for(var wi=0;wi<sub.weeks.length;wi++){
          var w=sub.weeks[wi];
          if(tday>=w.first&&tday<=w.last){loc={w:w,sb:sub};break;}
        }
      }
    }
    el.innerHTML="";
    var info=document.createElement("div");info.className="ov-now-info";
    info.innerHTML="<b>Day "+tday+"</b> · "+dow(tday)+" "+fd(tday)+" · 第 "+loc.w.n+" 周 · "+loc.sb.name;
    var btn=document.createElement("button");
    btn.type="button";btn.className="jump";btn.textContent="跳到今天";
    btn.addEventListener("click",function(){jumpToDay(tday);});
    el.appendChild(info);el.appendChild(btn);
  }else if(tday<1){
    el.innerHTML='<span class="ov-now-info"><b>Day 1</b> 将于 '+ymd(START)+' 启程 · 还有 '+(-tday+1)+' 天</span><span class="badge">未启程</span>';
  }else{
    el.innerHTML='<span class="ov-now-info">160 天计划已结束 '+(tday-160)+' 天 · 祝考试顺利</span><span class="badge">已结束</span>';
  }
}

/* ================= 进度 ================= */
var ringFg=document.getElementById("ringFg");
var pctEl=document.getElementById("pct");
var CIRC=2*Math.PI*16.5;
function refresh(){
  var total=0,done=0;
  function upd(o){
    var dn=0;o.inps.forEach(function(i){if(i.checked)dn++;});
    o.cnt.innerHTML="<b>"+dn+"</b> / "+o.inps.length+(dn===o.inps.length&&o.inps.length?' ✓ 完成':"");
    o.cnt.classList.toggle("done",dn===o.inps.length&&o.inps.length>0);
    o.bar.style.transform="scaleX("+(o.inps.length?dn/o.inps.length:0)+")";
  }
  weekCounts.forEach(upd);subCounts.forEach(upd);phaseCounts.forEach(upd);
  phaseCounts.forEach(function(o){o.inps.forEach(function(i){total++;if(i.checked)done++;});});
  document.getElementById("doneN").textContent=done;
  document.getElementById("totalN").textContent=total;
  var ratio=total?done/total:0;
  pctEl.textContent=Math.round(ratio*100)+"%";
  ringFg.style.strokeDashoffset=CIRC*(1-ratio);
  var ovTotal=document.getElementById("ovTotal");
  if(ovTotal)ovTotal.innerHTML="<b>"+done+"</b> / "+total+" · "+Math.round(ratio*100)+"%";
  ovChips.forEach(function(c){
    var dn=0;c.inps.forEach(function(i){if(i.checked)dn++;});
    c.num.textContent=dn+" / "+c.inps.length+(dn===c.inps.length?" ✓":"");
    c.chip.classList.toggle("done",dn===c.inps.length&&c.inps.length>0);
    c.bar.style.transform="scaleX("+(c.inps.length?dn/c.inps.length:0)+")";
  });
}

/* ================= 今天定位（随启程日重算） ================= */
function locateToday(){
  var tday=dayOffset();
  var btn=document.getElementById("goToday");
  btn.style.display="none";
  if(tday>=1&&tday<=160){
    var row=app.querySelector('.daycard[data-day="'+tday+'"]');
    if(row){
      todayN=tday;
      row.classList.add("today");
      var p=document.createElement("span");p.className="pill solid";p.textContent="今天";
      row.querySelector(".dc-head").appendChild(p);
      todayRef=weekRefs.filter(function(w){return tday>=w.first&&tday<=w.last;})[0]||null;
      if(todayRef&&todayRef.n!==1){
        var firstOpen=app.querySelector("details.week[open]");
        if(firstOpen)firstOpen.open=false;
        todayRef.phEl.open=true;todayRef.subEl.open=true;todayRef.weekEl.open=true;
      }
      btn.style.display="inline-block";
    }
  }
}

/* ================= 顶栏同步（启程日相关） ================= */
function syncChrome(){
  document.getElementById("startPick").value=ymd(START);
  document.getElementById("fRange").textContent=ymd(START)+" 至 "+ymd(new Date(START.getTime()+159*86400000));
  document.getElementById("afterDate").textContent=fd(161);
  var wd=(START.getDay()+4)%7;
  var hint=document.getElementById("startHint");
  if(wd===0){
    hint.textContent="启程日为周三 · 休息/测试日正好落在周日";
    hint.className="hint";
  }else{
    hint.textContent="⚠️ 启程日为周"+"日一二三四五六".charAt(START.getDay())+" · 休息/测试日将落在周"+"日一二三四五六".charAt(wd)+" 而非周日，建议改选周三";
    hint.className="hint warn-hint";
  }
}

/* ================= 顶部按钮 ================= */
document.getElementById("goToday").addEventListener("click",function(){
  if(!todayRef||!todayN)return;
  jumpToDay(todayN);
});
document.getElementById("expandAll").addEventListener("click",function(){
  app.querySelectorAll("details").forEach(function(d){d.open=true;});
});
document.getElementById("collapseAll").addEventListener("click",function(){
  app.querySelectorAll("details").forEach(function(d){d.open=false;});
});
document.getElementById("resetAll").addEventListener("click",function(){
  if(confirm("确定清空全部打卡记录？此操作不可恢复。")){
    state={};save();
    app.querySelectorAll('.week input[type="checkbox"]').forEach(function(c){c.checked=false;});
    refresh();
  }
});

/* ================= 启程日切换 ================= */
document.getElementById("startPick").addEventListener("change",function(){
  var d=parseYmd(this.value);
  if(!d)return;
  START=d;
  try{localStorage.setItem(SKEY,ymd(d));}catch(e){}
  renderAll();
  if(ME)scheduleSync();
});

renderAll();

/* ================= 云同步与同学进度 ================= */
var ME=null,syncTimer=null;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function rel(ts){
  if(!ts)return "未同步";
  var s=Math.floor((Date.now()-ts)/1000);
  if(s<60)return "刚刚";
  if(s<3600)return Math.floor(s/60)+" 分钟前";
  if(s<86400)return Math.floor(s/3600)+" 小时前";
  var d=new Date(ts);
  return pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+" "+pad2(d.getHours())+":"+pad2(d.getMinutes());
}
function api(p,opts){
  opts=opts||{};
  opts.credentials="same-origin";
  opts.headers=Object.assign({"Content-Type":"application/json"},opts.headers||{});
  return fetch(p,opts).then(function(r){return r.json().then(function(d){return {status:r.status,data:d};});});
}
function scheduleSync(){
  if(!ME)return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(pushProgress,900);
}
function pushProgress(){
  if(!ME||typeof fetch!=="function")return;
  api("/api/progress",{method:"POST",body:JSON.stringify({done:state,start:ymd(START)})})
    .then(function(){loadMates();}).catch(function(){});
}
function avaHTML(u,big){
  if(u.avatar)return '<img class="ava'+(big?" ava-lg":"")+'" src="/api/avatar/'+encodeURIComponent(u.username)+'?v='+Math.floor((u.updatedAt||0)/1000)+'" alt="">';
  return '<span class="ava'+(big?" ava-lg":"")+'">'+esc(u.displayName.charAt(0))+'</span>';
}
function renderAuthArea(){
  var slot=document.getElementById("authSlot");
  if(!slot)return;
  if(ME){
    slot.innerHTML='<a class="who" href="/settings.html" title="点击进入用户设置">'+avaHTML(ME)+'<span class="wn">'+esc(ME.displayName)+'</span><span class="gear">⚙</span></a><button type="button" id="logoutBtn">退出</button>';
    document.getElementById("logoutBtn").addEventListener("click",function(){
      api("/api/logout",{method:"POST"}).then(function(){location.reload();}).catch(function(){});
    });
  }else{
    slot.innerHTML='<a class="tbtn" href="/login.html">登录 / 注册</a>';
  }
}
function renderMates(list){
  var strip=document.getElementById("matesStrip");
  var sub=document.getElementById("mtSub");
  if(!strip)return;
  if(sub)sub.textContent=list.length?("共 "+list.length+" 人 · 60 秒自动刷新"):"暂无同学";
  strip.innerHTML="";
  if(!list.length){
    strip.innerHTML='<div class="empty">还没有同学加入，把链接发给一起备考的伙伴吧</div>';
    return;
  }
  list.forEach(function(u){
    var self=ME&&u.username===ME.username;
    var el=document.createElement("div");
    el.className="mate-chip"+(self?" self":"");
    var loc=u.sub?(u.sub.no+" "+u.sub.name+" · "+u.status):u.status;
    if(u.phase)loc+=" · "+(u.phase.no==="PHASE 1"?"P1":"P2");
    el.title=u.displayName+" · "+loc+" · 已完成 "+u.doneN+" / "+u.total;
    el.innerHTML='<span class="mh">'+avaHTML(u)
      +'<span class="mn">'+esc(u.displayName)+(self?"<i>我</i>":"")+'</span></span>'
      +'<span class="ms">'+esc(loc)+'</span>'
      +'<span class="mm"><span class="obar"><i></i></span><span class="onum">'+u.doneN+" / "+u.total+'</span><span class="mv" title="已背单词数">词 '+(u.vc||0)+'</span></span>'
      +'<span class="mtime">同步：'+rel(u.updatedAt)+' · '+u.percent+'%</span>';
    strip.appendChild(el);
    requestAnimationFrame(function(){el.querySelector(".obar i").style.transform="scaleX("+(u.total?u.doneN/u.total:0)+")";});
  });
}
function loadMates(){
  var strip=document.getElementById("matesStrip");
  if(!strip)return;
  if(!ME){
    var sub=document.getElementById("mtSub");
    if(sub)sub.textContent="未登录";
    strip.innerHTML='<a class="mate-login" href="/login.html">登录后可同步进度，并查看同学的学习阶段与完成率 →</a>';
    return;
  }
  if(typeof fetch!=="function")return;
  api("/api/users").then(function(r){if(r.status===200)renderMates(r.data.users||[]);}).catch(function(){});
}
(function initAuth(){
  renderAuthArea();
  loadMates();
  if(typeof fetch!=="function")return;
  api("/api/me").then(function(r){
    if(r.status===200&&r.data.user){
      ME=r.data.user;
      var p=r.data.progress;
      if(p&&p.done&&Object.keys(p.done).length&&!Object.keys(state).length){
        state=p.done;save();renderAll();
      }
      renderAuthArea();
      pushProgress();
      loadMates();
      setInterval(loadMates,60000);
    }else{
      renderAuthArea();loadMates();
    }
  }).catch(function(){});
})();

/* 桌面端默认展开使用说明，手机端保持折叠（首屏直达打卡内容） */
if(window.matchMedia("(min-width:641px)").matches){
  var introEl=document.querySelector(".intro");
  if(introEl)introEl.open=true;
}
