/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  text: string;
  answer: number | string;
  options: (number | string)[];
  topic: string;
}

const shuffle = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const getOptions = (correct: number | string, isNumeric: boolean = true) => {
  if (isNumeric) {
    const val = Number(correct);
    const opts = new Set<number>([val]);
    while (opts.size < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const o = val + offset;
      if (o >= 0 && o !== val) opts.add(o);
    }
    return shuffle(Array.from(opts));
  }
  return [correct];
};

export const generateQuestionsPool = (levelId: string): Question[] => {
  const pool: Question[] = [];
  const usedTexts = new Set<string>();

  const add = (text: string, answer: number | string, options?: (number | string)[]) => {
    if (!usedTexts.has(text) && pool.length < 50) {
      usedTexts.add(text);
      pool.push({
        text,
        answer,
        options: options || getOptions(answer),
        topic: levelId
      });
    }
  };

  if (levelId === 'mongkok') {
    // 50 variants of Addition/Subtraction within 20,000
    const contexts = ["買書包", "買玩具車", "買波鞋", "買禮物", "食自助餐", "買口罩", "買文具", "坐的士", "商場購物", "圖書館罰款"];
    for (let i = 0; i < 150 && pool.length < 50; i++) {
      const a = Math.floor(Math.random() * 9000) + 1000;
      const b = Math.floor(Math.random() * 9000) + 1000;
      const ctx = contexts[i % contexts.length];
      const type = i % 4;
      if (type === 0) add(`${ctx}用咗 $${a}，另外又買咗 $${b} 嘅嘢，一共用咗幾多錢？`, a + b);
      else if (type === 1) add(`${ctx}原價 $${a + b}，依家減價 $${a}，現價係幾多？`, b);
      else if (type === 2) add(`${a} + ${b} = ?`, a + b);
      else {
        const fiveDigit = Math.floor(Math.random() * 90000) + 10000;
        add(`「${fiveDigit}」入面嘅「${String(fiveDigit)[0]}」係代表幾多？`, Number(String(fiveDigit)[0]) * 10000);
      }
    }
  } else if (levelId === 'starferry') {
    // 50 variants of Mult/Div
    for (let i = 0; i < 150 && pool.length < 50; i++) {
      const a = Math.floor(Math.random() * 8) + 2; 
      const b = Math.floor(Math.random() * 60) + 10;
      const type = i % 4;
      if (type === 0) add(`一打雞蛋有 12 隻，買 ${a} 打總共有幾多隻？`, a * 12);
      else if (type === 1) add(`一艘渡輪載咗 ${a * b} 人，分 ${a} 層坐，平均每層幾多人？`, b);
      else if (type === 2) add(`${a} × ${b} = ?`, a * b);
      else add(`天星小輪每層可以坐 ${b} 人，${a} 艘船一共可以坐幾多人？`, a * b);
    }
  } else if (levelId === 'oceanpark') {
    // 50 variants of Fractions
    for (let i = 0; i < 150 && pool.length < 50; i++) {
        const dens = [10, 12, 15, 20];
        const den = dens[i % dens.length];
        const n1 = Math.floor(Math.random() * (den/2)) + 1;
        const n2 = Math.floor(Math.random() * (den/2)) + 1;
        const type = i % 4;
        if (type === 0) add(`哥哥食咗 ${n1}/${den} 個披薩，細佬食咗 ${n2}/${den} 個，佢哋一共食咗幾個？(只填分子)`, n1 + n2);
        else if (type === 1) add(`一盒糖分做 ${den} 份，食咗 ${n1} 份之後，仲剩幾分之幾？(只填分子)`, den - n1);
        else if (type === 2) add(`全班有 ${den} 人，${n1} 人係男仔，女仔佔全班幾分之幾？(只填分子)`, den - n1);
        else add(`小明重 35 kg 400 g，即係幾多克？`, 35400);
    }
  } else if (levelId === 'spacemuseum') {
    // 50 variants of Time/Calendar
    for (let i = 0; i < 150 && pool.length < 50; i++) {
       const type = i % 5;
       if (type === 0) {
         const h = Math.floor(Math.random() * 11) + 1;
         add(`下午 ${h} 時 30 分，用 24 小時制寫法係？`, `${h+12}:30`, [`${h+12}:30`, `${h}:30`, "10:30", "00:30"]);
       } else if (type === 1) {
         const hours = [2, 3, 4, 5, 8, 10];
         const h = hours[i % hours.length];
         add(`${h} 小時等於幾多分鐘？`, h * 60);
       } else if (type === 2) {
         add(`平年一年總共有幾多日？`, 365, [365, 366, 360, 364]);
       } else if (type === 3) {
         const m = Math.floor(Math.random() * 5) + 1;
         add(`${m} 分鐘等於幾多秒？`, m * 60);
       } else {
         const months = ["一", "三", "五", "七", "八", "十", "十二"];
         add(`${months[i % months.length]}月總共有幾多日？`, 31, [28, 29, 30, 31]);
       }
    }
  } else if (levelId === 'bigbuddha') {
    // 50 variants of Shapes/Perimeter
    for (let i = 0; i < 150 && pool.length < 50; i++) {
        const type = i % 4;
        if (type === 0) {
          const side = Math.floor(Math.random() * 10) + 10;
          add(`正方形邊長係 ${side} 厘米，佢嘅周界係幾多？`, side * 4);
        } else if (type === 1) {
          const l = Math.floor(Math.random() * 10) + 12;
          const w = Math.floor(Math.random() * 5) + 6;
          add(`長方形長 ${l} 厘米，闊 ${w} 厘米，周界係幾多？`, (l + w) * 2);
        } else if (type === 2) {
          add(`下列邊種圖形有四條等長嘅邊同埋四個直角？`, "正方形", ["正方形", "長方形", "菱形", "梯形"]);
        } else {
          add(`一個菱形嘅邊長係 8 cm，佢嘅周界係幾多 cm？`, 32);
        }
    }
  }

  return pool;
};
