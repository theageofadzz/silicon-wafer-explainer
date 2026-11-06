# 工艺核对

核对日期：2026-11-06。来源用于事实研究，不代表取得厂商照片的再发布许可；
成片没有取用以下厂商网页的摄影或图解。

## 一次生产路线的概述

1. 石英的主要成分为二氧化硅。碳质还原剂在电炉中参与还原，得到工业硅。
2. 工业硅可转化为氯硅烷并精馏提纯，再通过西门子法在加热硅芯上沉积高纯多晶硅。
3. 直拉法将高纯硅装入石英坩埚，熔化后用籽晶引导生长；实际工艺还需控制掺杂、
   热场、拉速、旋转、气氛和缺陷。本片压缩了时间，没有给出可执行的工厂工艺参数。
4. 单晶棒经整形、切片、研磨、蚀刻、抛光、清洗与检测后成为抛光硅片。
   不同生产线的设备、顺序细节和选配处理可能不同。
5. 空白抛光硅片进入器件加工后，才会经历光刻、沉积、刻蚀等后续步骤。
   本片不把镜面抛光描述为芯片制造完成。

## 主要一手来源

- [SUMCO: Production Processes](https://www.sumcosi.com/english/products/process/)：
  CZ籽晶旋转提拉、石英坩埚、约1420℃的工艺介绍、微量硼磷调整电阻率、
  切片、研磨、蚀刻、化学机械抛光、清洗与检测。
- [WACKER: Polysilicon](https://www.wacker.com/cms/en-us/products/product-groups/polysilicon/polysilicon.html)：
  高纯多晶硅在半导体材料中的作用及其生产体系。
- [WACKER 2021: Ultrapure Silicon for Solar Power](https://reports.wacker.com/2021/annual-report/sustainable-solutions/ultrapure-silicon-for-solar-power.html)：
  石英碳热还原、工业硅转为三氯氢硅、精馏提纯，再沉积为高纯硅。
- [WACKER 2022: Purity Is Our Recipe for Success](https://reports.wacker.com/2022/annual-report/sustainable-solutions/purity-is-our-recipe-for-success.html)：
  半导体级多晶硅对杂质的要求，以及三氯氢硅转换、精馏和高纯沉积。
- [Hemlock Semiconductor: Markets & Technologies](https://www.hscpoly.com/markets-technologies/)：
  超高纯多晶硅及其作为电子材料的定位；用于与“纯度”和“单晶”概念区分交叉核对。
- 晶格和尺寸的确定性检查延续样片：
  `opening/edit/v3/model/review/geometry.json`；
  300mm直径、0.775mm示例厚度、金刚石立方最近邻与四配位分别由同一几何模型产生。

## 图解边界

- 天然石英标本不是已达到工业高纯等级的证明。
- 晶格球、键、掺杂颜色、粒子数量和表面起伏为便于观察的示意；
  一颗黄色球的显示比例不代表实际掺杂浓度。
- 热区温度只表述为1400多摄氏度；没有声称所有硅熔体始终恰为某个整数温度。
- 多晶取向图与单晶取向图是两个观察对象的切换，不是晶粒自行旋转合并的工艺。
- 加工和清洗的时间压缩，微观粗糙度放大；没有伪造检测实测数据。
- 模型中的支架、外壳和管路为功能结构示意，不是对某一厂商设备的工程复刻。
