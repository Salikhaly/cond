function boxWord(value){const n=Math.abs(Number(value)||0)%100,last=n%10;return n>10&&n<20?'коробок':last===1?'коробка':last>=2&&last<=4?'коробки':'коробок';}
module.exports={boxWord};
