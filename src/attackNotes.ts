export const ATTACK_NOTES={
  contact:['近身碰撞','被围住时，朝空隙闪避。'],
  charge:['直线冲撞','冲撞方向锁定后，向侧面闪避。'],
  cleave:['扇形挥砍','绕到敌人背后，或退出扇形。'],
  disk:['地面重击','离开重击圈。古树砸地还能打碎甲虫外壳。'],
  ring:['蛾粉环带','环内和环外都安全，走向更近的一边。'],
  sap:['树脂弹','横移躲开树脂弹。'],
  shard:['晶片齐射','从晶片之间穿过。'],
  dust:['蛾粉散射','拉开距离，从弹幕空隙穿过。'],
  seed:['古树种弹','从两枚种弹之间穿过。'],
  missile:['远程弹体','往弹道侧面移动。']
} as const;
export type AttackNote=keyof typeof ATTACK_NOTES;
