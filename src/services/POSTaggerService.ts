type POSType = 
  | 'n'   // 名词
  | 'v'   // 动词
  | 'a'   // 形容词
  | 'd'   // 副词
  | 'r'   // 代词
  | 'p'   // 介词
  | 'c'   // 连词
  | 'm'   // 数词
  | 'q'   // 量词
  | 'u'   // 助词
  | 'x'   // 标点
  | 'w'   // 其他
  | 'ns'  // 地名
  | 'nt'  // 机构名
  | 'nz'  // 其他专名
  | 'nh'  // 人名
  | 'nr'  // 名词性短语
  | 'vd'  // 动动词
  | 'vn'  // 名动词
  | 'ad'  // 形副词
  | 'an'  // 名形容词
  ;

export interface TaggedWord {
  word: string;
  pos: POSType;
  start: number;
  end: number;
}

export const POS_LABELS: Record<POSType, string> = {
  n: '名词',
  v: '动词',
  a: '形容词',
  d: '副词',
  r: '代词',
  p: '介词',
  c: '连词',
  m: '数词',
  q: '量词',
  u: '助词',
  x: '标点',
  w: '其他',
  ns: '地名',
  nt: '机构',
  nz: '专名',
  nh: '人名',
  nr: '名词短语',
  vd: '动动词',
  vn: '名动词',
  ad: '形副词',
  an: '名形容词',
};

export const POS_COLORS: Record<POSType, string> = {
  n: '#4CAF50',
  v: '#2196F3',
  a: '#FF9800',
  d: '#9C27B0',
  r: '#00BCD4',
  p: '#607D8B',
  c: '#795548',
  m: '#E91E63',
  q: '#FF5722',
  u: '#9E9E9E',
  x: '#BDBDBD',
  w: '#757575',
  ns: '#8BC34A',
  nt: '#3F51B5',
  nz: '#009688',
  nh: '#CDDC39',
  nr: '#FFC107',
  vd: '#03A9F4',
  vn: '#673AB7',
  ad: '#FF4081',
  an: '#F44336',
};

const COMMON_WORDS: Record<string, POSType> = {
  // 助词
  的: 'u', 了: 'u', 吗: 'u', 呢: 'u', 吧: 'u', 啊: 'u', 呀: 'u',
  // 代词
  我: 'r', 你: 'r', 他: 'r', 她: 'r', 它: 'r', 我们: 'r', 你们: 'r', 他们: 'r',
  这: 'r', 那: 'r', 什么: 'r', 谁: 'r', 哪: 'r', 怎么: 'r', 为什么: 'r',
  // 介词
  在: 'p', 从: 'p', 到: 'p', 向: 'p', 对: 'p', 为: 'p', 以: 'p', 被: 'p',
  // 连词
  和: 'c', 与: 'c', 或: 'c', 而: 'c', 但: 'c', 如果: 'c', 虽然: 'c', 因为: 'c', 所以: 'c',
  // 副词
  很: 'd', 太: 'd', 也: 'd', 就: 'd', 都: 'd', 不: 'd', 没: 'd', 再: 'd', 还: 'd',
  // 量词
  个: 'q', 只: 'q', 条: 'q', 张: 'q', 把: 'q', 件: 'q', 本: 'q', 次: 'q', 回: 'q',
};

const VERB_ENDINGS = ['化', '搞', '做', '说', '看', '听', '写', '走', '跑', '吃', '喝', '玩', '想', '爱', '恨', '买', '卖', '学', '教', '用', '打', '开', '关', '放', '拿', '送', '接', '送', '帮', '让', '请', '使', '把', '去', '来', '进', '出', '上', '下', '起', '落', '升', '降', '生', '死', '活', '睡', '醒', '站', '坐', '躺', '飞', '游', '跳', '爬', '滚', '转', '停', '动', '变', '成', '长', '短', '增', '减', '加', '乘', '除', '算', '算', '画', '照', '录', '摄', '测', '试', '验', '查', '找', '寻', '搜', '探', '观', '注', '视', '盯', '瞄', '瞄', '瞄', '谈', '聊', '议', '论', '争', '辩', '驳', '批', '赞', '夸', '奖', '罚', '惩', '治', '救', '护', '守', '卫', '攻', '防', '守', '击', '打', '杀', '灭', '烧', '焚', '毁', '坏', '修', '补', '改', '换', '替', '装', '卸', '载', '运', '搬', '移', '挪', '拖', '拉', '推', '挤', '压', '按', '握', '抓', '持', '举', '抬', '捧', '抱', '搂', '拥', '吻', '咬', '啃', '含', '吞', '咽', '吐', '喷', '吹', '吸', '呼', '叹', '嗅', '闻', '尝', '品', '触', '摸', '抚', '拍', '敲', '击', '撞', '碰', '跌', '摔', '掉', '落', '扔', '抛', '掷', '投', '撒', '散', '聚', '集', '合', '分', '离', '别', '散', '聚', '会', '见', '遇', '逢', '遭', '受', '得', '失', '欠', '还', '借', '贷', '租', '赁', '雇', '聘', '邀', '请', '叫', '喊', '唤', '招', '唤', '唤'];

function isChineseWord(char: string): boolean {
  return /[\u4e00-\u9fa5]/.test(char);
}

function detectPOSType(word: string): POSType {
  if (COMMON_WORDS[word]) {
    return COMMON_WORDS[word];
  }

  if (VERB_ENDINGS.some(e => word.endsWith(e) || word === e)) {
    return 'v';
  }

  if (/^\d+.*$/.test(word)) {
    return 'm';
  }

  if (word.length === 1 && isChineseWord(word)) {
    if (/[\u4e00-\u9fa5]/.test(word)) {
      return 'n';
    }
  }

  if (/[\u4e00-\u9fa5]{2,}/.test(word)) {
    return 'n';
  }

  return 'w';
}

export function segmentChineseText(text: string): TaggedWord[] {
  const tagged: TaggedWord[] = [];
  let currentWord = '';
  let startPos = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (isChineseWord(char)) {
      if (currentWord && !isChineseWord(currentWord)) {
        tagged.push({
          word: currentWord,
          pos: detectPOSType(currentWord),
          start: startPos,
          end: i,
        });
        currentWord = '';
        startPos = i;
      }
      currentWord += char;
    } else if (currentWord && isChineseWord(currentWord)) {
      tagged.push({
        word: currentWord,
        pos: detectPOSType(currentWord),
        start: startPos,
        end: i,
      });
      currentWord = char;
      startPos = i;
    } else {
      currentWord += char;
    }
  }

  if (currentWord) {
    tagged.push({
      word: currentWord,
      pos: detectPOSType(currentWord),
      start: startPos,
      end: text.length,
    });
  }

  return tagged;
}

export function getPOSColor(pos: POSType): string {
  return POS_COLORS[pos] || '#757575';
}

export function getPOSLabel(pos: POSType): string {
  return POS_LABELS[pos] || '未知';
}