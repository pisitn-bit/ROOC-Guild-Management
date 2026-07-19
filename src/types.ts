export interface Member {
  id: string;
  name: string;
  role: 'admin' | 'member';
  participatedWarsCount: number;
  hasReceivedInCycle: boolean; // ได้รับของประมูลในรอบ/วัฏจักรนี้หรือยัง (สิทธิ์จะรีเซ็ตเมื่อทุกคนได้ครบ)
  joinedAt: string;
  jobClass?: string; // อาชีพตัวละคร เช่น Lord Knight, High Priest
}

export interface MasterItem {
  id: string;
  name: string;
  itemType: 'material' | 'card' | 'equip' | 'consumable';
  whitelistJobClasses?: string[]; // อาชีพที่ได้รับสิทธิ์ Whitelist
  whitelistMemberIds?: string[]; // สมาชิกที่ได้รับสิทธิ์ Whitelist
}

export interface EventDrop {
  id: string;
  itemName: string;
  quantity: number; // จำนวนไอเทม
  assignedToMemberId: string | null; // สมาชิกที่ประมูลได้/จัดสรรให้
  assignedToMemberName: string | null;
  bidAmount: number; // ราคาประมูล
  whitelistJobClasses?: string[]; // อาชีพที่ได้รับสิทธิ์ Whitelist
  whitelistMemberIds?: string[]; // สมาชิกที่ได้รับสิทธิ์ Whitelist
  originalDropId?: string; // ไอดีไอเทมดั้งเดิมก่อนแบ่งเฉลี่ย
  isSplit?: boolean; // ระบุว่าเป็นไอเทมที่ถูกเฉลี่ยแบ่งมาจากชิ้นใหญ่
  originalQuantity?: number; // จำนวนดั้งเดิมก่อนการแบ่ง
}

export interface EventExcuse {
  memberId: string;
  memberName: string;
  reason: string;
  timestamp: string;
}

export interface GuildEvent {
  id: string;
  title: string; // เช่น Guild League ประจำวันที่ 16/07/2026
  type: 'league' | 'overrun';
  date: string;
  participants: string[]; // รายชื่อ Member.id ที่เข้าร่วมกิจกรรมนี้
  participantClasses?: { [memberId: string]: string }; // รายชื่ออาชีพเฉพาะกิจคราวนั้นๆ: { [memberId]: jobClass }
  excuses?: EventExcuse[]; // รายชื่อผู้ขอลาพร้อมเหตุผล
  drops: EventDrop[]; // รายการของที่ดรอปและถูกประมูลในรอบนี้
  status: 'active' | 'completed';
  completedAt?: string; // เวลาสิ้นสุดกิจกรรม
}

export interface RafflePrize {
  id: string;
  name: string;
  quantity: number;
}

export interface RaffleResult {
  id: string;
  prizeName: string;
  winnerName: string;
  timestamp: string;
  itemType: string;
  eventId?: string; // ไอดีกิจกรรมที่เกี่ยวข้องกับการสุ่ม/แจก
}

export interface DiscordConfig {
  webhookUrl: string;
  botName: string;
  enabled: boolean;
}

export interface GuildState {
  guildName?: string; // ชื่อกิลด์กำหนดเอง
  members: Member[];
  events: GuildEvent[];
  masterItems: MasterItem[];
  rafflePrizes: RafflePrize[];
  raffleResults: RaffleResult[];
  discordConfig: DiscordConfig;
  systemPIN: string;
  adminPIN?: string;
  guildGuidelines?: string; // กฎเกณฑ์และข้อตกลงกิลด์
  lastUpdated: string;
  jobClasses?: string[]; // รายชื่ออาชีพกำหนดเองสำหรับกิลด์
}

export const DEFAULT_JOB_CLASSES = [
  'Lord Knight',
  'High Priest',
  'Sniper',
  'Assassin Cross',
  'High Wizard',
  'Whitesmith',
  'Paladin',
  'Scholar',
  'Creator',
  'Stalker',
  'Clown',
  'Gypsy',
  'Champion',
  'Ninja',
  'Gunslinger',
  'Super Novice'
];

