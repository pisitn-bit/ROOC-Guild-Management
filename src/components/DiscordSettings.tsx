import React, { useState } from 'react';
import { GuildState, DiscordConfig } from '../types';
import { 
  Bell, 
  Settings, 
  Send, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface DiscordSettingsProps {
  state: GuildState;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  onSendDiscordNotification: (title: string, message: string, fields: any[], color: number) => void;
  showAlert?: (title: string, message: string) => void;
}

export default function DiscordSettings({ 
  state, 
  isAdmin, 
  onUpdateState, 
  onSendDiscordNotification,
  showAlert 
}: DiscordSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(state.discordConfig.webhookUrl);
  const [botName, setBotName] = useState(state.discordConfig.botName);
  const [enabled, setEnabled] = useState(state.discordConfig.enabled);

  const [showWebhook, setShowWebhook] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isTesting, setIsTesting] = useState(false);

  const triggerAlert = (title: string, message: string) => {
    if (showAlert) {
      showAlert(title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  // 1. Save discord configuration
  const handleSaveConfig = () => {
    onUpdateState({
      ...state,
      discordConfig: {
        webhookUrl: webhookUrl.trim(),
        botName: botName.trim(),
        enabled
      }
    });
    triggerAlert('สำเร็จ', 'บันทึกการตั้งค่า Discord สำเร็จแล้ว !');
  };

  // 2. Test sending notification
  const handleTestNotification = async () => {
    if (!webhookUrl.trim() && enabled) {
      triggerAlert('คำเตือน', 'กรุณากรอก Webhook URL ก่อนทดสอบส่ง');
      return;
    }

    setIsTesting(true);
    setTestStatus({ type: null, message: '' });

    try {
      const response = await fetch("/api/discord-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🧪 ทดสอบระบบการเชื่อมต่อบอทกิลด์ RO Classic",
          message: "นี่คือข้อความทดสอบจากระบบจัดการกิลด์ Ragnarok Origin Classic ของคุณ เพื่อยืนยันว่าการทำงานของ Webhook สมบูรณ์ดี !",
          fields: [
            { name: "📡 สถานะการทดสอบ", value: "✅ เชื่อมต่อสำเร็จเรียบร้อยดี", inline: true },
            { name: "🛠️ ผู้รับสิทธิ์ทดสอบ", value: botName || "บอทกิลด์", inline: true }
          ],
          color: 3066993, // Green
          webhookUrlOverride: webhookUrl.trim() // Override with unsaved inputs
        })
      });

      const data = await response.json();
      if (data.success) {
        if (data.simulated) {
          setTestStatus({
            type: 'success',
            message: `จำลองการส่งข้อมูลสำเร็จ (ไม่ได้กรอก Webhook): ${data.message}`
          });
        } else {
          setTestStatus({
            type: 'success',
            message: 'ส่งทดสอบไปยัง Discord Channel ของคุณเรียบร้อยแล้ว ! กรุณาตรวจสอบห้องแชท'
          });
        }
      } else {
        setTestStatus({
          type: 'error',
          message: `ล้มเหลว: ${data.message}`
        });
      }
    } catch (e: any) {
      setTestStatus({
        type: 'error',
        message: `ข้อผิดพลาดเครือข่าย: ${e?.message || e}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6" id="discord-tab">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <Bell className="text-blue-400 w-6 h-6" />
          ระบบเชื่อมต่อการแจ้งเตือน Discord (Discord Bot Integration)
        </h2>
        <p className="text-xs text-slate-400">
          แจ้งผลสรุปการประมูล และผู้โชคดีวงล้อสุ่มไอเทมตรงเข้าดิสคอร์ดกิลด์ทันทีเพื่อความโปร่งใสในกลุ่มสมาชิก
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings Form Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-400" />
              การตั้งค่าบอท Discord Webhook
            </h3>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-850">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 block">เปิดใช้งานการแจ้งเตือนอัตโนมัติ</span>
                <span className="text-[10px] text-slate-500 block">ส่งข้อความลง Discord อัตโนมัติเมื่อจบประมูลหรือสุ่มวงล้อ</span>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="w-10 h-5 bg-slate-800 checked:bg-blue-500 rounded-full cursor-pointer accent-blue-500"
              />
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">Discord Webhook URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showWebhook ? "text" : "password"}
                    disabled={!isAdmin}
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 pl-3 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhook(!showWebhook)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Bot Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">ชื่อแสดงผลของบอท (Bot Display Name)</label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="เช่น บอทกิลด์ RO Classic"
                value={botName}
                onChange={e => setBotName(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold"
              />
            </div>

            {/* Save & Test Buttons */}
            {isAdmin ? (
              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl text-xs transition-all border border-blue-500/20 shadow-lg"
                  id="save-discord-btn"
                >
                  บันทึกการตั้งค่าบอท
                </button>
                <button
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  id="test-discord-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบส่งข้อความ'}
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-red-400 italic font-semibold">
                * เฉพาะหัวหน้ากิลด์ (Admin) เท่านั้นที่สามารถแก้ไขและทดสอบการตั้งค่าบอท Discord Webhook ได้
              </p>
            )}

            {/* Test Status feedback */}
            {testStatus.type && (
              <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
                testStatus.type === 'success' 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20' 
                  : 'bg-red-950/40 text-red-300 border-red-500/20'
              }`}>
                {testStatus.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
                <p className="font-semibold leading-normal">{testStatus.message}</p>
              </div>
            )}

          </div>
        </div>

        {/* Instructions Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <h3 className="font-bold text-slate-200 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-yellow-500" />
              วิธีขอ Webhook URL เพื่อนำมาเชื่อมต่อ
            </h3>
            
            <ol className="list-decimal pl-4 space-y-2 text-slate-400">
              <li>
                เปิดแอปพลิเคชัน <strong>Discord</strong> บนคอมพิวเตอร์ของคุณ
              </li>
              <li>
                ไปที่ห้องแชท (Text Channel) ที่ต้องการรับข่าวสารของกิลด์ เช่น ห้อง <span className="text-yellow-400 font-bold">#ประมูลกิลด์</span>
              </li>
              <li>
                คลิกขวาที่ชื่อห้องแชทแล้วเลือก <strong>"แก้ไขช่องแชท" (Edit Channel)</strong>
              </li>
              <li>
                ไปที่หัวข้อ <strong>"การเชื่อมต่อภายนอก" (Integrations)</strong> ทางด้านซ้าย
              </li>
              <li>
                คลิกที่ปุ่ม <strong>"ดูเว็บฮุค" (Webhooks)</strong> จากนั้นกดปุ่ม <strong>"เว็บฮุคใหม่" (New Webhook)</strong>
              </li>
              <li>
                ตั้งชื่อบอทตามต้องการ และเลือกห้องรับข่าวสารให้ถูกต้อง
              </li>
              <li>
                คลิกที่ปุ่ม <strong>"คัดลอก URL ของเว็บฮุค" (Copy Webhook URL)</strong> แล้วนำมาวางลงในช่องซ้ายมือในแอปนี้ !
              </li>
            </ol>

            <div className="bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl mt-4">
              <p className="text-[11px] text-blue-400 font-medium">
                💡 ข้อดี: สมาชิกในห้องแชทจะเห็นภาพรวมการประมูล ราคาปิด และคนชนะทันทีโดยไม่ต้องเข้าแอปตลอดเวลา ช่วยเพิ่มความโปร่งใสและกระตุ้นการร่วมสงครามอย่างยิ่งยวด !
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
