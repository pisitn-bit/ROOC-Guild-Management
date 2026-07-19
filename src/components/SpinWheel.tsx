import React, { useState, useEffect, useRef } from 'react';
import { GuildState, Member, RafflePrize, RaffleResult, GuildEvent, EventDrop, DEFAULT_JOB_CLASSES } from '../types';
import { 
  Gift, 
  Users, 
  Play, 
  HelpCircle, 
  Dices, 
  CheckCircle, 
  RotateCcw, 
  ChevronRight, 
  Volume2, 
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Award,
  Package,
  Info,
  Shield,
  X,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpinWheelProps {
  state: GuildState;
  currentUser: Member | null;
  isAdmin: boolean;
  onUpdateState: (newState: GuildState) => void;
  onSendDiscordNotification: (title: string, message: string, fields: any[], color: number) => void;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function SpinWheel({ 
  state, 
  currentUser, 
  isAdmin, 
  onUpdateState, 
  onSendDiscordNotification,
  showAlert,
  showConfirm
}: SpinWheelProps) {
  
  const [raffleMode, setRaffleMode] = useState<'wheel' | 'auto'>('wheel');

  // Whitelist modal states
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [whitelistTargetDrop, setWhitelistTargetDrop] = useState<{ eventId: string; dropId: string } | null>(null);
  const [selectedWhitelistClasses, setSelectedWhitelistClasses] = useState<string[]>([]);
  const [selectedWhitelistMembers, setSelectedWhitelistMembers] = useState<string[]>([]);

  // Fallback safe triggers for sandboxed iframe
  const triggerAlert = (title: string, message: string) => {
    if (showAlert) {
      showAlert(title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (showConfirm) {
      showConfirm(title, message, onConfirm);
    } else {
      if (confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    }
  };

  // Selected event to pull participants from
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    const active = state.events?.find(e => e.status === 'active');
    return active ? active.id : (state.events?.[0]?.id || 'all');
  });

  const [excludeReceived, setExcludeReceived] = useState(true);

  // Local state of who is checked for the raffle
  const [participants, setParticipants] = useState<string[]>([]);

  // Prize configuration
  const [customPrizeName, setCustomPrizeName] = useState<string>('สิทธิ์เลือกของประมูล (Priority Choice)');

  // Helper to add drop to specific event
  const handleAddDropToEvent = (eventId: string, itemName: string, quantity: number) => {
    const masterItem = (state.masterItems || []).find(mi => mi.name === itemName);
    const updatedEvents = (state.events || []).map(ev => {
      if (ev.id === eventId) {
        const newDrop = {
          id: 'drop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          itemName,
          quantity,
          assignedToMemberId: null,
          assignedToMemberName: null,
          bidAmount: 0,
          whitelistJobClasses: masterItem?.whitelistJobClasses || [],
          whitelistMemberIds: masterItem?.whitelistMemberIds || []
        };
        return {
          ...ev,
          drops: [...(ev.drops || []), newDrop]
        };
      }
      return ev;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // Helper to delete drop from event
  const handleDeleteDropFromEvent = (eventId: string, dropId: string) => {
    const updatedEvents = (state.events || []).map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          drops: (ev.drops || []).filter(d => d.id !== dropId)
        };
      }
      return ev;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
  };

  // Open whitelist setup for a drop
  const handleOpenWhitelistModal = (eventId: string, dropId: string) => {
    const event = (state.events || []).find(e => e.id === eventId);
    const drop = event?.drops?.find(d => d.id === dropId);
    if (drop) {
      setWhitelistTargetDrop({ eventId, dropId });
      setSelectedWhitelistClasses(drop.whitelistJobClasses || []);
      setSelectedWhitelistMembers(drop.whitelistMemberIds || []);
      setIsWhitelistModalOpen(true);
    }
  };

  // Save whitelist settings for a drop
  const handleSaveWhitelist = () => {
    if (!whitelistTargetDrop) return;
    const { eventId, dropId } = whitelistTargetDrop;
    const updatedEvents = (state.events || []).map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          drops: (ev.drops || []).map(d => {
            if (d.id === dropId) {
              return {
                ...d,
                whitelistJobClasses: selectedWhitelistClasses,
                whitelistMemberIds: selectedWhitelistMembers
              };
            }
            return d;
          })
        };
      }
      return ev;
    });

    onUpdateState({
      ...state,
      events: updatedEvents
    });
    setIsWhitelistModalOpen(false);
    setWhitelistTargetDrop(null);
  };

  // Reset all auction results for the current selected event
  const handleResetAuction = () => {
    if (selectedEventId === 'all') return;
    const activeEvent = events.find(e => e.id === selectedEventId);
    if (!activeEvent) return;

    triggerConfirm(
      'ยืนยันการล้างผลการประมูลทั้งหมด',
      'คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการล้างผลการประมูลและการจัดสรรของรางวัลทั้งหมดในกิจกรรมรอบนี้? ข้อมูลการจัดสรรและไอเทมที่ถูกเฉลี่ยจะถูกกู้คืนเป็นค่าเริ่มต้นก่อนจัดสรร',
      () => {
        // Reconstruct the original drops (re-merging any split drops)
        const originalDropsMap = new Map<string, EventDrop>();
        const assignedMemberIdsToReset = new Set<string>();

        activeEvent.drops.forEach(drop => {
          if (drop.assignedToMemberId) {
            assignedMemberIdsToReset.add(drop.assignedToMemberId);
          }

          if (drop.isSplit && drop.originalDropId) {
            const existing = originalDropsMap.get(drop.originalDropId);
            if (existing) {
              existing.quantity += drop.quantity;
            } else {
              originalDropsMap.set(drop.originalDropId, {
                ...drop,
                id: drop.originalDropId,
                assignedToMemberId: null,
                assignedToMemberName: null,
                bidAmount: 0,
                isSplit: false,
                originalDropId: undefined
              });
            }
          } else {
            originalDropsMap.set(drop.id, {
              ...drop,
              assignedToMemberId: null,
              assignedToMemberName: null,
              bidAmount: 0,
              isSplit: false,
              originalDropId: undefined
            });
          }
        });

        const resetDrops = Array.from(originalDropsMap.values());

        // Update the event in the events list
        const updatedEvents = events.map(ev => {
          if (ev.id === selectedEventId) {
            return {
              ...ev,
              drops: resetDrops
            };
          }
          return ev;
        });

        // Reset the members' hasReceivedInCycle status
        const updatedMembers = members.map(m => {
          if (assignedMemberIdsToReset.has(m.id)) {
            return {
              ...m,
              hasReceivedInCycle: false
            };
          }
          return m;
        });

        // Clean up raffle results associated with this event
        const updatedRaffleResults = raffleResults.filter(res => {
          // If the result is linked to this event, filter it out
          if (res.eventId === selectedEventId) return false;

          // Fallback: check if the prizeName contains any drop item names from the current event
          const isRelatedToEventDrop = activeEvent.drops.some(drop => {
            const nameToMatch = drop.itemName.replace(/\s+/g, '').toLowerCase();
            const prizeToMatch = res.prizeName.replace(/\s+/g, '').toLowerCase();
            return prizeToMatch.includes(nameToMatch) || nameToMatch.includes(prizeToMatch);
          });
          if (isRelatedToEventDrop) return false;

          return true;
        });

        onUpdateState({
          ...state,
          events: updatedEvents,
          members: updatedMembers,
          raffleResults: updatedRaffleResults
        });

        onSendDiscordNotification(
          `🔄 รีเซ็ตและล้างผลการประมูลกิลด์รอบนี้`,
          `ผู้ดูแลระบบได้ทำการล้างผลการจัดสรรและประมูลของรางวัลทั้งหมดประจำรอบกิจกรรม **${activeEvent.title}** เรียบร้อยแล้ว เพื่อเตรียมการจัดสรรใหม่`,
          [],
          15158332 // Red-ish
        );

        triggerAlert('สำเร็จ', 'ล้างผลการประมูลและการจัดสรรของรางวัลรอบนี้ทั้งหมดเรียบร้อยแล้ว');
      }
    );
  };

  // Manually delete a single raffle result from the audit trail
  const handleDeleteRaffleResult = (resultId: string) => {
    const resultToDelete = raffleResults.find(res => res.id === resultId);
    if (!resultToDelete) return;

    triggerConfirm(
      'ลบประวัติการรับรางวัล',
      `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการรับรางวัลของ "${resultToDelete.winnerName}" รายการนี้ออกจากตาราง? ระบบจะคืนสิทธิ์คิวประมูลให้สมาชิกท่านนี้ด้วย`,
      () => {
        const updatedResults = raffleResults.filter(res => res.id !== resultId);

        // Find the member by name and set hasReceivedInCycle to false
        const updatedMembers = members.map(m => {
          if (m.name === resultToDelete.winnerName) {
            return {
              ...m,
              hasReceivedInCycle: false
            };
          }
          return m;
        });

        // Also check if this raffle result matches any drop in the active event, and if so, unassign it!
        let updatedEvents = [...events];
        if (selectedEventId !== 'all') {
          updatedEvents = events.map(ev => {
            if (ev.id === selectedEventId) {
              return {
                ...ev,
                drops: ev.drops.map(d => {
                  const nameToMatch = d.itemName.replace(/\s+/g, '').toLowerCase();
                  const prizeToMatch = resultToDelete.prizeName.replace(/\s+/g, '').toLowerCase();
                  const isMatchingPrize = prizeToMatch.includes(nameToMatch) || nameToMatch.includes(prizeToMatch);
                  
                  const member = members.find(m => m.name === resultToDelete.winnerName);
                  const isMatchingWinner = d.assignedToMemberId === member?.id;

                  if (isMatchingPrize && isMatchingWinner) {
                    return {
                      ...d,
                      assignedToMemberId: null,
                      assignedToMemberName: null,
                      bidAmount: 0
                    };
                  }
                  return d;
                })
              };
            }
            return ev;
          });
        }

        onUpdateState({
          ...state,
          raffleResults: updatedResults,
          members: updatedMembers,
          events: updatedEvents
        });

        triggerAlert('สำเร็จ', `ลบประวัติและคืนสิทธิ์คิวของ "${resultToDelete.winnerName}" เรียบร้อยแล้ว`);
      }
    );
  };

  // Wheel Physics & Animation state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<Member | null>(null);
  const currentAngleRef = useRef(0);
  const spinSpeedRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  const events = state.events || [];
  const members = state.members || [];
  const rafflePrizes = state.rafflePrizes || [];
  const raffleResults = state.raffleResults || [];

  // Update selected participants when selectedEventId or events change
  useEffect(() => {
    if (selectedEventId === 'all') {
      // Pull all members
      setParticipants(members.map(m => m.id));
    } else {
      const event = events.find(e => e.id === selectedEventId);
      if (event) {
        setParticipants(event.participants);
      } else {
        setParticipants([]);
      }
    }
  }, [selectedEventId, events, members]);

  // Helper to count how many items a member has been assigned in the selected event (or cycle)
  const getAssignedCount = (memberId: string) => {
    if (selectedEventId === 'all') {
      const member = members.find(m => m.id === memberId);
      return member?.hasReceivedInCycle ? 1 : 0;
    }
    const currentEvent = events.find(e => e.id === selectedEventId);
    if (!currentEvent) return 0;
    return (currentEvent.drops || []).filter(d => d.assignedToMemberId === memberId).length;
  };

  // Find minimum assigned count among selected participants to determine eligibility
  const eligibleAssignedCount = (() => {
    const selectedParticipants = members.filter(m => participants.includes(m.id));
    if (selectedParticipants.length === 0) return 0;
    const counts = selectedParticipants.map(m => getAssignedCount(m.id));
    return Math.min(...counts);
  })();

  // Active member structures representing the slices
  const activeParticipants = members.filter(m => {
    const isMatched = participants.includes(m.id);
    if (!isMatched) return false;
    if (excludeReceived) {
      return getAssignedCount(m.id) === eligibleAssignedCount;
    }
    return true;
  });

  // Redraw Wheel whenever participants, members, events or settings change
  useEffect(() => {
    drawWheel();
  }, [participants, members, selectedEventId, events, excludeReceived]);

  // Color palette for professional RPG-style wheel slices
  const sliceColors = [
    '#1e1b4b', // Deep indigo
    '#0f172a', // Dark slate
    '#312e81', // Blue indigo
    '#020617', // Pitch black
    '#1e293b', // Medium slate
    '#4338ca', // Royal blue
  ];

  const getSliceColor = (index: number) => {
    return sliceColors[index % sliceColors.length];
  };

  // Draw RPG-style high-quality Spin Wheel on Canvas
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (activeParticipants.length === 0) {
      // Draw premium dark void placeholder
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 15, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#3b82f6';
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('กรุณาเลือกหรือเพิ่มผู้เข้าร่วมวอร์', radius, radius);
      return;
    }

    const sliceAngle = (2 * Math.PI) / activeParticipants.length;

    // Draw slices
    activeParticipants.forEach((member, i) => {
      const angle = currentAngleRef.current + i * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 12, angle, angle + sliceAngle);
      ctx.fillStyle = getSliceColor(i);
      ctx.fill();
      
      // Draw slice separator line
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#3b82f630'; // subtle glowing blue border
      ctx.stroke();

      // Write member name
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';

      // Draw subtle text shadow
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      
      const text = member.name.length > 12 ? member.name.substring(0, 10) + '..' : member.name;
      ctx.fillText(text, radius - 25, 4);
      ctx.restore();
    });

    // Draw Wheel Outer Ring
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 12, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3b82f6'; // Neon blue border
    ctx.stroke();

    // Draw outer golden dots around the ring for decoration
    const totalDots = 16;
    for (let d = 0; d < totalDots; d++) {
      const dotAngle = d * (2 * Math.PI / totalDots);
      const dotX = radius + (radius - 12) * Math.cos(dotAngle);
      const dotY = radius + (radius - 12) * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#fbbf24'; // Gold light dot
      ctx.fill();
    }

    // Draw Gold Center Pin Button
    ctx.beginPath();
    ctx.arc(radius, radius, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#d97706'; // gold
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24'; // yellow gold
    ctx.stroke();

    // Core glass bubble effect
    const gradient = ctx.createRadialGradient(radius - 5, radius - 5, 2, radius, radius, 22);
    gradient.addColorStop(0, '#fef08a');
    gradient.addColorStop(1, '#b45309');
    ctx.beginPath();
    ctx.arc(radius, radius, 16, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  // 1. Premium Wheel Spin deceleration physics
  const spinWheel = () => {
    if (isSpinning || activeParticipants.length === 0) return;

    setIsSpinning(true);
    setWheelWinner(null);
    
    // Set dynamic initial velocity
    spinSpeedRef.current = Math.random() * 0.45 + 0.35; // Random initial speed
    const friction = 0.988; // Deceleration rate

    const animate = () => {
      currentAngleRef.current += spinSpeedRef.current;
      currentAngleRef.current = currentAngleRef.current % (2 * Math.PI);
      spinSpeedRef.current *= friction;

      drawWheel();

      if (spinSpeedRef.current < 0.0015) {
        setIsSpinning(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        calculateWinner();
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  // Instant spin draw bypassing the animation
  const spinWheelInstantly = () => {
    if (isSpinning || activeParticipants.length === 0) return;

    setWheelWinner(null);
    
    // Choose a random winner from activeParticipants
    const winnerIndex = Math.floor(Math.random() * activeParticipants.length);
    const winner = activeParticipants[winnerIndex];
    setWheelWinner(winner);

    // Set canvas to a random angle and redraw
    currentAngleRef.current = Math.random() * 2 * Math.PI;
    drawWheel();

    // Fire confetti on winning!
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 }
    });
  };

  // Pointer pointing down at 270 degrees (1.5 * Math.PI)
  const calculateWinner = () => {
    if (activeParticipants.length === 0) return;

    const sliceAngle = (2 * Math.PI) / activeParticipants.length;
    const normalizedAngle = (1.5 * Math.PI - currentAngleRef.current) % (2 * Math.PI);
    const positiveAngle = normalizedAngle < 0 ? normalizedAngle + 2 * Math.PI : normalizedAngle;
    
    const winnerIndex = Math.floor(positiveAngle / sliceAngle) % activeParticipants.length;
    const winner = activeParticipants[winnerIndex];

    setWheelWinner(winner);

    // Fire confetti on winning!
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 }
    });
  };

  // Save lucky wheel winner
  const handleSaveWheelWinner = () => {
    if (!wheelWinner) return;

    let prizeNameStr = customPrizeName || 'รางวัลสุ่มวงล้อ';
    let updatedEvents = [...events];
    let updatedMembers = [...members];

    if (selectedEventId !== 'all') {
      const currentSelectedEvent = events.find(e => e.id === selectedEventId);
      const unassignedDrop = currentSelectedEvent?.drops?.find(d => !d.assignedToMemberId);
      
      if (currentSelectedEvent && unassignedDrop) {
        prizeNameStr = `ไอเทม: ${unassignedDrop.itemName}`;
        
        // Update the drop in the event
        updatedEvents = events.map(ev => {
          if (ev.id === selectedEventId) {
            return {
              ...ev,
              drops: ev.drops.map(d => d.id === unassignedDrop.id ? {
                ...d,
                assignedToMemberId: wheelWinner.id,
                assignedToMemberName: wheelWinner.name
              } : d)
            };
          }
          return ev;
        });

        // Mark the member as received in cycle
        updatedMembers = members.map(m => m.id === wheelWinner.id ? {
          ...m,
          hasReceivedInCycle: true
        } : m);
      }
    } else {
      // If no event, just mark hasReceivedInCycle
      updatedMembers = members.map(m => m.id === wheelWinner.id ? {
        ...m,
        hasReceivedInCycle: true
      } : m);
    }

    const newResult: RaffleResult = {
      id: `ref-${Date.now()}`,
      prizeName: prizeNameStr,
      winnerName: wheelWinner.name,
      timestamp: new Date().toISOString(),
      itemType: 'raffle',
      eventId: selectedEventId
    };

    onUpdateState({
      ...state,
      members: updatedMembers,
      raffleResults: [newResult, ...raffleResults],
      events: updatedEvents
    });

    // Notify Discord
    onSendDiscordNotification(
      `🎉 มีผู้โชคดีหมุนวงล้อนำโชคสำเร็จ!`,
      `ขอแสดงความยินดีกับผู้โชคดีประจำรอบกิจกรรมกิลด์`,
      [
        { name: "🏆 ผู้ได้รับรางวัล", value: `**${wheelWinner.name}**`, inline: true },
        { name: "🎁 ของรางวัลที่สุ่มได้", value: prizeNameStr, inline: true },
        { name: "📌 แหล่งรายชื่อที่ดึงมา", value: selectedEventId === 'all' ? "สมาชิกกิลด์ทั้งหมด" : events.find(e => e.id === selectedEventId)?.title || 'กิจกรรมสมาคม', inline: false }
      ],
      9442302 // Purple/Pink
    );

    setWheelWinner(null);
  };

  // 2. Auto Distribution Raffle
  const handleAutoDistribute = () => {
    if (activeParticipants.length === 0) {
      triggerAlert('ผิดพลาด', 'กรุณาเลือกสมาชิกที่จะรับสิทธิ์สุ่มรางวัล');
      return;
    }

    const currentSelectedEvent = events.find(e => e.id === selectedEventId);
    const poolOfPrizes: string[] = [];

    if (currentSelectedEvent && currentSelectedEvent.drops?.length > 0) {
      currentSelectedEvent.drops.forEach(d => {
        for (let i = 0; i < d.quantity; i++) {
          poolOfPrizes.push(d.itemName);
        }
      });
    }

    if (poolOfPrizes.length === 0) {
      triggerAlert('ผิดพลาด', 'ไม่พบไอเทมประมูลในกิจกรรมที่เลือก กรุณาเพิ่มของรางวัล/ไอเทมก่อนทำการสุ่ม');
      return;
    }

    triggerConfirm(
      'ยืนยันการจับสลากแจกจ่าย',
      'ยืนยันระบบการสุ่มแจกจ่ายไอเทมทั้งหมดประจำกิจกรรมให้แก่สมาชิกทุกคนที่ติ๊กถูกหรือไม่? สมาชิกจะได้รับไอเทมแบบสุ่มสิทธิ์แบบทันที โดยคำนึงถึงรายชื่ออาชีพและสมาชิกที่ติด Whitelist',
      () => {
        const newResults: RaffleResult[] = [];
        let updatedEvents = [...events];

        if (currentSelectedEvent) {
          const tempParticipants = [...activeParticipants].sort(() => Math.random() - 0.5);
          const assignedMemberIds = new Set<string>();
          const assignedDrops: EventDrop[] = [];

          // Helper to check if a drop should be averaged/split
          const shouldAverageDrop = (itemName: string) => {
            const name = itemName.toLowerCase();
            return name.includes('เศษสมุด') || name.includes('ขนนก') || name.includes('feather') || name.includes('fragment');
          };

          // Helper to distribute a quantity Q among P participants as evenly as possible.
          const distributeEvenly = (quantity: number, numParticipants: number): number[] => {
            if (numParticipants <= 0) return [];
            const base = Math.floor(quantity / numParticipants);
            const remainder = quantity % numParticipants;
            const result: number[] = [];
            for (let i = 0; i < numParticipants; i++) {
              result.push(base + (i < remainder ? 1 : 0));
            }
            return result;
          };

          currentSelectedEvent.drops.forEach(drop => {
            if (drop.assignedToMemberId) {
              assignedDrops.push(drop);
              return;
            }

            if (shouldAverageDrop(drop.itemName) && tempParticipants.length > 0) {
              // Respect whitelist if present, otherwise distribute to all tempParticipants
              const whitelistedParticipants = tempParticipants.filter(m => {
                const matchesClass = !drop.whitelistJobClasses || drop.whitelistJobClasses.length === 0 || drop.whitelistJobClasses.includes(m.jobClass || '');
                const matchesMember = !drop.whitelistMemberIds || drop.whitelistMemberIds.length === 0 || drop.whitelistMemberIds.includes(m.id);
                return matchesClass && matchesMember;
              });

              const targets = whitelistedParticipants.length > 0 ? whitelistedParticipants : tempParticipants;
              const P = targets.length;
              const base = Math.floor(drop.quantity / P);
              const remainder = drop.quantity % P;

              // 1. Assign the base quantity to each matching participant
              if (base > 0) {
                targets.forEach(participant => {
                  const splitDropId = `drop-split-${drop.id}-${participant.id}`;
                  assignedDrops.push({
                    ...drop,
                    id: splitDropId,
                    quantity: base,
                    assignedToMemberId: participant.id,
                    assignedToMemberName: participant.name,
                    originalDropId: drop.id,
                    isSplit: true
                  });

                  newResults.push({
                    id: `ref-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    prizeName: `ไอเทม: ${drop.itemName} (x${base} ชิ้น)`,
                    winnerName: participant.name,
                    timestamp: new Date().toISOString(),
                    itemType: 'auto-raffle',
                    eventId: currentSelectedEvent.id
                  });
                });
              }

              // 2. Keep the remainder as an unassigned drop for bidding/buyout
              if (remainder > 0) {
                assignedDrops.push({
                  ...drop,
                  id: `drop-remainder-${drop.id}`,
                  quantity: remainder,
                  assignedToMemberId: null,
                  assignedToMemberName: null,
                  bidAmount: 0,
                  originalDropId: drop.id,
                  isSplit: true
                });
              }
            } else {
              // Normal drop logic (non-averaged items like cards, equipment)
              // Find candidates who match whitelist and haven't received anything in this batch
              const candidates = tempParticipants.filter(m => {
                if (assignedMemberIds.has(m.id)) return false;
                const matchesClass = !drop.whitelistJobClasses || drop.whitelistJobClasses.length === 0 || drop.whitelistJobClasses.includes(m.jobClass || '');
                const matchesMember = !drop.whitelistMemberIds || drop.whitelistMemberIds.length === 0 || drop.whitelistMemberIds.includes(m.id);
                return matchesClass && matchesMember;
              });

              if (candidates.length > 0) {
                const winner = candidates[Math.floor(Math.random() * candidates.length)];
                assignedMemberIds.add(winner.id);

                newResults.push({
                  id: `ref-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  prizeName: `ไอเทม: ${drop.itemName}`,
                  winnerName: winner.name,
                  timestamp: new Date().toISOString(),
                  itemType: 'auto-raffle',
                  eventId: currentSelectedEvent.id
                });

                assignedDrops.push({
                  ...drop,
                  assignedToMemberId: winner.id,
                  assignedToMemberName: winner.name
                });
                return;
              }

              // Fallback to any active participant matching the whitelist
              const fallbackCandidates = tempParticipants.filter(m => {
                const matchesClass = !drop.whitelistJobClasses || drop.whitelistJobClasses.length === 0 || drop.whitelistJobClasses.includes(m.jobClass || '');
                const matchesMember = !drop.whitelistMemberIds || drop.whitelistMemberIds.length === 0 || drop.whitelistMemberIds.includes(m.id);
                return matchesClass && matchesMember;
              });

              if (fallbackCandidates.length > 0) {
                const winner = fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
                assignedMemberIds.add(winner.id);

                newResults.push({
                  id: `ref-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  prizeName: `ไอเทม: ${drop.itemName}`,
                  winnerName: winner.name,
                  timestamp: new Date().toISOString(),
                  itemType: 'auto-raffle',
                  eventId: currentSelectedEvent.id
                });

                assignedDrops.push({
                  ...drop,
                  assignedToMemberId: winner.id,
                  assignedToMemberName: winner.name
                });
                return;
              }

              // Absolute fallback (no matching whitelisted members, pick any unassigned)
              const absoluteCandidates = tempParticipants.filter(m => !assignedMemberIds.has(m.id));
              if (absoluteCandidates.length > 0) {
                const winner = absoluteCandidates[Math.floor(Math.random() * absoluteCandidates.length)];
                assignedMemberIds.add(winner.id);

                newResults.push({
                  id: `ref-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  prizeName: `ไอเทม: ${drop.itemName}`,
                  winnerName: winner.name,
                  timestamp: new Date().toISOString(),
                  itemType: 'auto-raffle',
                  eventId: currentSelectedEvent.id
                });

                assignedDrops.push({
                  ...drop,
                  assignedToMemberId: winner.id,
                  assignedToMemberName: winner.name
                });
                return;
              }

              assignedDrops.push(drop);
            }
          });

          updatedEvents = events.map(ev => {
            if (ev.id === currentSelectedEvent.id) {
              return {
                ...ev,
                drops: assignedDrops
              };
            }
            return ev;
          });
        }

        onUpdateState({
          ...state,
          raffleResults: [...newResults, ...raffleResults],
          events: updatedEvents
        });

        confetti({
          particleCount: 220,
          spread: 120,
          origin: { y: 0.5 }
        });

        const discordFields = newResults.map((res, idx) => ({
          name: `🎁 ไอเทมประมูลที่ ${idx + 1}`,
          value: `**${res.winnerName}** ได้สิทธิ์รับ **${res.prizeName}**`,
          inline: false
        }));

        onSendDiscordNotification(
          `🤖 ระบบจัดสรรแบ่งปันไอเทมประมูลกิจกรรมสุ่มออโต้กิลด์สำเร็จ!`,
          `สรุปผลผู้ได้รับสิทธิ์ประจำรอบกิจกรรม ${currentSelectedEvent?.title || ''}`,
          discordFields,
          3066993 // Teal
        );
      }
    );
  };

  return (
    <div className="space-y-6" id="wheel-tab">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Gift className="text-yellow-400 w-6 h-6 animate-bounce" />
            วงล้อสุ่มคิวและจัดการยอดประมูลกิลด์ (Guild Auction Priority Wheel)
          </h2>
          <p className="text-xs text-slate-400">
            ระบบสุ่มหมุนหาคิวรับสิทธิ์และเฉลี่ยจัดสรรไอเทมประมูลหลัก เช่น การ์ด ขนนก เพื่อให้กระจายสู่สมาชิกผู้ร่วมกิจกรรมในรอบนั้น ๆ อย่างโปร่งใสที่สุด
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300">
        <Info className="w-5 h-5 shrink-0 text-blue-400" />
        <div>
          <span className="font-bold block text-blue-400">🎯 หลักการทำงานของคิวคัดกรอง:</span>
          ระบบจะอ้างอิงรายชื่อและดรอปตามวันที่มีกิจกรรม <span className="text-yellow-500 font-bold">แอดมินหรือหัวหน้ากิลด์สามารถหมุนคิวเพื่อเลือกผู้ชนะสิทธิ์รับของ</span> โดยคิวการหมุนจะคัดกรองสมาชิกตามความเท่าเทียม (คนที่ยังไม่ได้ของจะมีสิทธิ์ลุ้นก่อน) เพื่อไม่ให้เกิดปัญหารับของซ้ำซ้อน
        </div>
      </div>

      {/* Mode Switches */}
      <div className="flex gap-2 border-b border-slate-850 pb-0.5">
        <button
          onClick={() => setRaffleMode('wheel')}
          className={`pb-2 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
            raffleMode === 'wheel'
              ? 'text-blue-400 border-blue-500 font-black'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          วงล้อจัดคิวประมูลสด (Interactive Auction Wheel)
        </button>
        <button
          onClick={() => setRaffleMode('auto')}
          className={`pb-2 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
            raffleMode === 'auto'
              ? 'text-blue-400 border-blue-500 font-black'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Dices className="w-4 h-4" />
          สุ่มเฉลี่ยรางวัลอัตโนมัติ (Fair Auto-Distribution)
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Source Settings & Slices Selector */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Data Source Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-300 block">⚡ ผูกกับรอบกิจกรรมวันที่:</label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none text-xs font-bold text-yellow-500"
              >
                <option value="all">👥 สมาชิกกิลด์ทั้งหมดในคลังระบบ ({members.length} คน)</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.type === 'league' ? '🛡️' : '🔥'} {ev.title} ({ev.participants.length} คนลงชื่อ)
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Filter Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeReceived}
                  onChange={e => setExcludeReceived(e.target.checked)}
                  className="accent-blue-500 rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-bold text-blue-300">กรองคนที่เคยได้รับของในไซเคิลนี้ออกแล้ว (คิวเท่าเทียม)</span>
              </label>
            </div>

            {/* Displaying Current Registered Members & Classes before Wheel spin */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>รายชื่อผู้ร่วมกิจกรรม ({activeParticipants.length} คน):</span>
                <div className="flex gap-2 text-blue-400">
                  <button onClick={() => setParticipants(members.map(m => m.id))}>ทั้งหมด</button>
                  <button onClick={() => setParticipants([])} className="text-slate-500">ล้าง</button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-950 p-2 rounded-xl bg-slate-950/50">
                {members.map(member => {
                  const isChecked = participants.includes(member.id);
                  const meetsFilter = !excludeReceived || !member.hasReceivedInCycle;
                  
                  if (selectedEventId !== 'all' && !events.find(e => e.id === selectedEventId)?.participants.includes(member.id)) {
                    return null; // Only show event participants if an event is selected
                  }

                  return (
                    <label 
                      key={member.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs ${
                        isChecked && meetsFilter
                          ? 'bg-blue-500/10 border border-blue-500/25 text-blue-300 font-bold' 
                          : 'bg-transparent border border-transparent text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setParticipants(participants.filter(id => id !== member.id));
                            } else {
                              setParticipants([...participants, member.id]);
                            }
                          }}
                          className="accent-blue-500 w-3.5 h-3.5"
                        />
                        <span>{member.name}</span>
                        <span className="text-[9px] text-slate-400 font-normal">({member.jobClass || 'Lord Knight'})</span>
                      </div>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold font-mono ${
                        member.hasReceivedInCycle ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/40 text-emerald-400'
                      }`}>
                        {member.hasReceivedInCycle ? 'ได้ของแล้ว' : 'มีสิทธิ์คิว'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* หน้าจัดการไอเทมประมูล (Item Management Interface) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">📦 จัดการไอเทมประมูลประจำกิจกรรม</h3>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-extrabold uppercase font-mono">
                Admin Panel
              </span>
            </div>

            {isAdmin ? (
              <div className="space-y-4 text-xs">
                {/* 1. เลือกกิจกรรม */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">1. เลือกกิจกรรมที่ต้องการลงไอเทม:</label>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none font-semibold text-xs text-yellow-500"
                  >
                    <option value="all">-- กรุณาเลือกกิจกรรมเพื่อเพิ่มของ --</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.type === 'league' ? '🛡️' : '🔥'} {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEventId !== 'all' ? (
                  (() => {
                    const activeEvent = events.find(e => e.id === selectedEventId);
                    if (!activeEvent) return null;

                    return (
                      <div className="space-y-4 pt-1">
                        {/* 2. กรอกจำนวน และ เลือกไอเทมตาม Master Data */}
                        <div className="grid grid-cols-12 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                          <div className="col-span-8 space-y-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">2. เลือกไอเทมจาก Master:</label>
                            <select
                              id="drop-master-select"
                              className="w-full bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-800 text-xs"
                            >
                              <option value="">-- เลือกไอเทม --</option>
                              {state.masterItems?.map(item => (
                                <option key={item.id} value={item.name}>
                                  {item.name} ({item.itemType === 'material' ? 'วัตถุดิบ' : item.itemType === 'card' ? 'การ์ด' : item.itemType === 'equip' ? 'อุปกรณ์' : 'ของบริโภค'})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-4 space-y-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">จำนวน:</label>
                            <input
                              id="drop-qty-input"
                              type="number"
                              min={1}
                              defaultValue={1}
                              className="w-full bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-800 font-mono text-center text-xs"
                            />
                          </div>

                          <div className="col-span-12 pt-2 border-t border-slate-900 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const selectEl = document.getElementById('drop-master-select') as HTMLSelectElement;
                                const qtyEl = document.getElementById('drop-qty-input') as HTMLInputElement;
                                if (!selectEl || !qtyEl) return;
                                const itemName = selectEl.value;
                                const quantity = parseInt(qtyEl.value, 10) || 1;
                                if (!itemName) {
                                  triggerAlert('ไม่ได้เลือกไอเทม', 'กรุณาเลือกไอเทมประมูลก่อน');
                                  return;
                                }
                                handleAddDropToEvent(activeEvent.id, itemName, quantity);
                                selectEl.value = '';
                                qtyEl.value = '1';
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>บันทึกและเพิ่มไอเทม</span>
                            </button>
                          </div>
                        </div>

                        {/* List of current drops for this event */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">รายการไอเทมในรอบกิจกรรมนี้:</span>
                          {activeEvent.drops?.length === 0 ? (
                            <p className="text-xs text-slate-600 italic py-2 text-center bg-slate-950/20 rounded-xl border border-slate-850/50">ยังไม่มีไอเทมดรอปในกิจกรรมนี้</p>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {activeEvent.drops.map(drop => {
                                const totalWhitelistCount = (drop.whitelistJobClasses?.length || 0) + (drop.whitelistMemberIds?.length || 0);
                                return (
                                  <div key={drop.id} className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850/60 text-[11px] space-y-1.5 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                      <div className="space-y-0.5">
                                        <span className="font-extrabold text-slate-200 block">🎮 {drop.itemName}</span>
                                        <span className="text-[10px] text-slate-500 font-mono block">จำนวน: x{drop.quantity} ชิ้น</span>
                                        {drop.assignedToMemberName && (
                                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold mt-1 inline-block">
                                            ผู้ได้รับ: {drop.assignedToMemberName}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenWhitelistModal(activeEvent.id, drop.id)}
                                          className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                                            totalWhitelistCount > 0 
                                              ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20' 
                                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                                          }`}
                                          title="ตั้งค่า Whitelist ให้ไอเทมนี้"
                                        >
                                          <Shield className="w-3.5 h-3.5 fill-current opacity-70" />
                                          <span className="text-[9.5px] font-bold">
                                            {totalWhitelistCount > 0 ? `Whitelist (${totalWhitelistCount})` : 'Whitelist'}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDropFromEvent(activeEvent.id, drop.id)}
                                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                                          title="ลบไอเทมนี้ออกจากกิจกรรม"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    {totalWhitelistCount > 0 && (
                                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-850/30">
                                        {drop.whitelistJobClasses?.map(jc => (
                                          <span key={jc} className="bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-semibold px-1.5 py-0.5 rounded">
                                            🛡️ {jc}
                                          </span>
                                        ))}
                                        {drop.whitelistMemberIds?.map(mId => {
                                          const mName = state.members.find(m => m.id === mId)?.name || 'Unknown';
                                          return (
                                            <span key={mId} className="bg-blue-950/20 border border-blue-500/10 text-[9px] text-blue-400 font-semibold px-1.5 py-0.5 rounded">
                                              👤 {mName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {(() => {
                            const hasAssigned = activeEvent.drops?.some(d => d.assignedToMemberId);
                            if (!hasAssigned) return null;
                            return (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={handleResetAuction}
                                  className="w-full bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  🔄 ล้างผลการประมูลรอบนี้ทั้งหมด
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 text-center text-slate-500 text-[11px] italic">
                    โปรดเลือกกิจกรรมด้านบนเพื่อเริ่มบันทึกและจัดการไอเทม
                  </div>
                )}
              </div>
            ) : (
              /* Non-admin read-only view of selected event drops */
              <div className="space-y-3 text-xs">
                {selectedEventId !== 'all' ? (
                  (() => {
                    const activeEvent = events.find(e => e.id === selectedEventId);
                    if (!activeEvent) return null;

                    return (
                      <div className="space-y-3">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">📋 รายการไอเทมประมูลในกิจกรรมนี้:</span>
                        {activeEvent.drops?.length === 0 ? (
                          <p className="text-xs text-slate-600 italic py-4 text-center bg-slate-950/20 border border-slate-850/50 rounded-xl">ยังไม่มีไอเทมประมูลในรอบนี้</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto">
                            {activeEvent.drops.map(drop => {
                              const totalWhitelistCount = (drop.whitelistJobClasses?.length || 0) + (drop.whitelistMemberIds?.length || 0);
                              return (
                                <div key={drop.id} className="p-2.5 bg-slate-950/30 rounded-xl border border-slate-850/40 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                      <span className="font-extrabold text-slate-300 block">💎 {drop.itemName}</span>
                                      {drop.assignedToMemberName && (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold mt-0.5 inline-block font-sans">
                                          ผู้ได้รับ: {drop.assignedToMemberName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono text-yellow-500 font-bold bg-slate-950 px-2 py-0.5 rounded text-[10px]">x{drop.quantity} ชิ้น</span>
                                  </div>
                                  {totalWhitelistCount > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-850/30">
                                      {drop.whitelistJobClasses?.map(jc => (
                                        <span key={jc} className="bg-slate-900/60 border border-slate-800 text-[9px] text-slate-400 font-semibold px-1.5 py-0.2 rounded">
                                          🛡️ {jc}
                                        </span>
                                      ))}
                                      {drop.whitelistMemberIds?.map(mId => {
                                        const mName = state.members.find(m => m.id === mId)?.name || 'Unknown';
                                        return (
                                          <span key={mId} className="bg-blue-950/20 border border-blue-500/10 text-[9px] text-blue-400 font-semibold px-1.5 py-0.2 rounded">
                                            👤 {mName}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-950/20 border border-slate-850/50 rounded-xl">โปรดเลือกกิจกรรมในช่อง "ผูกกับรอบกิจกรรมวันที่" ด้านบนเพื่อดูรายการไอเทม</p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Col: Spinning wheel or Fair auto allocation */}
        <div className="lg:col-span-7 space-y-6">
          
          {raffleMode === 'wheel' ? (
            /* CLASSIC GLOSSY WHEEL VIEW */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
              
              {/* Blue glowing ambient ring */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>

                            {/* Active Prize Info Banner (Replaced prize selector with clean display of next target item) */}
              {selectedEventId !== 'all' && (() => {
                const currentSelectedEvent = events.find(e => e.id === selectedEventId);
                const unassignedDrop = currentSelectedEvent?.drops?.find(d => !d.assignedToMemberId);
                if (!unassignedDrop) return null;
                return (
                  <div className="w-full max-w-xs text-center p-3 bg-blue-950/20 border border-blue-500/25 rounded-2xl z-10 animate-fade-in">
                    <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest block mb-1">🎁 ไอเทมถัดไปที่จะได้รับการจับสปินสุ่ม:</span>
                    <strong className="text-yellow-500 text-sm font-extrabold flex items-center justify-center gap-1">
                      🎮 {unassignedDrop.itemName} (x1 ชิ้น)
                    </strong>
                  </div>
                );
              })()}

              {/* Interactive Wheel & Pin container */}
              <div className="relative p-2 bg-slate-950 rounded-full border-4 border-slate-800/80 shadow-[0_0_35px_rgba(59,130,246,0.15)]">
                
                {/* Pointer pointer downward at 270 degrees (Top) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                  <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-yellow-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-bounce"></div>
                </div>

                {/* Main canvas */}
                <canvas 
                  ref={canvasRef} 
                  width={300} 
                  height={300} 
                  className="rounded-full bg-slate-950"
                />
              </div>

              {/* Trigger Button */}
              {(() => {
                const currentEvent = selectedEventId === 'all' ? null : events.find(e => e.id === selectedEventId);
                const totalDrops = currentEvent?.drops?.length || 0;
                const unassignedDropsCount = currentEvent?.drops?.filter(d => !d.assignedToMemberId).length || 0;
                const isEventOutofStock = selectedEventId !== 'all' && totalDrops > 0 && unassignedDropsCount === 0;
                const noDropsAvailable = selectedEventId !== 'all' && totalDrops === 0;

                return (
                  <div className="w-full max-w-xs space-y-3 z-10">
                    <div className="flex gap-2">
                      <button
                        onClick={spinWheel}
                        disabled={isSpinning || activeParticipants.length === 0 || isEventOutofStock || noDropsAvailable}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-xl text-[11px] transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 uppercase tracking-widest font-mono"
                        id="spin-wheel-btn"
                      >
                        <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                        {isSpinning 
                          ? 'กำลังหมุน...' 
                          : isEventOutofStock 
                            ? 'ของหมด!' 
                            : noDropsAvailable 
                              ? 'ไม่มีของดรอป' 
                              : activeParticipants.length === 0 
                                ? 'ไม่มีคนสิทธิ์ลุ้น' 
                                : 'สปินวงล้อ'
                        }
                      </button>

                      <button
                        type="button"
                        onClick={spinWheelInstantly}
                        disabled={isSpinning || activeParticipants.length === 0 || isEventOutofStock || noDropsAvailable}
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-black px-4 py-4 rounded-xl text-[11px] transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-lg uppercase tracking-widest font-mono"
                        title="สุ่มผลลัพธ์ทันที (Skip)"
                      >
                        <Zap className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Winner presentation block */}
              {wheelWinner && (
                <div className="w-full bg-slate-950 p-4 border border-yellow-500/30 rounded-2xl text-center space-y-3 animate-fade-in z-10 shadow-2xl">
                  <div className="space-y-1">
                    <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-widest block">🎉 ขอแสดงความยินดีกับผู้โชคดี! 🎉</span>
                    <h3 className="text-xl font-extrabold text-slate-100 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      {wheelWinner.name}
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </h3>
                    <p className="text-xs text-slate-400">
                      ดวงสมพงศ์ ได้รับรางวัล: <strong className="text-blue-400 text-sm">
                        {customPrizeName || 'รางวัลสุ่มวงล้อ'}
                      </strong>
                    </p>
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={handleSaveWheelWinner}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-yellow-500/10"
                      id="save-winner-btn"
                    >
                      อนุมัติรางวัล & ส่งประวัติลง Discord
                    </button>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* AUTO ALLOCATION RAFFLE VIEW */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Dices className="w-5 h-5 text-blue-400" />
                  <h3 className="font-extrabold text-slate-100 text-sm">สุ่มแบ่งสิทธิ์เฉลี่ยอัตโนมัติ (Fair Allocation Engine)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ระบบจะสุ่มแจกจ่ายสิทธิ์รับไอเทมประจำรอบกิจกรรมนี้ทั้งหมดให้แก่ผู้ร่วมกิจกรรมที่คัดกรองไว้ทางซ้ายมือในครั้งเดียวทันที โดยหลีกเลี่ยงการจับโดนคนซ้ำซ้อน เหมาะสำหรับจัดสรรสิทธิ์ผู้ดร็อปวัตถุดิบวอร์ทั่วไปแบบรวดเร็วและยุติธรรมที่สุด
                </p>
              </div>

              {/* Visual simulation detail cards */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">ของรางวัลรวมทั้งหมดในกิจกรรม:</span>
                  <span className="font-extrabold text-blue-400 font-mono">
                    {(() => {
                      const currentSelectedEvent = events.find(e => e.id === selectedEventId);
                      return currentSelectedEvent?.drops?.reduce((sum, d) => sum + d.quantity, 0) || 0;
                    })()} ชิ้น
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">จำนวนผู้มีสิทธิ์ได้รับการจับสุ่มรอบนี้:</span>
                  <span className="font-extrabold text-yellow-500 font-mono">
                    {activeParticipants.length} คน
                  </span>
                </div>
                <div className="border-t border-slate-850 pt-2 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>อัตราการได้รับรางวัลเฉลี่ย:</span>
                  <span className="text-emerald-400 font-mono">
                    {(() => {
                      const currentSelectedEvent = events.find(e => e.id === selectedEventId);
                      const totalQty = currentSelectedEvent?.drops?.reduce((sum, d) => sum + d.quantity, 0) || 0;
                      return activeParticipants.length > 0 
                        ? `${Math.min(100, Math.floor((totalQty / activeParticipants.length) * 100))}%` 
                        : '0%';
                    })()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAutoDistribute}
                  disabled={activeParticipants.length === 0 || !(events.find(e => e.id === selectedEventId)?.drops?.length > 0)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg"
                  id="auto-dist-btn"
                >
                  <Dices className="w-4 h-4" />
                  สั่งรันการสุ่มเฉลี่ยและแบ่งแจกของรางวัลทันที!
                </button>
              </div>

            </div>
          )}

          {/* Audit Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-md">
            <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-blue-400" />
              บันทึกประวัติการจับรางวัลกิลด์ (Raffle Audit Trail)
            </h3>

            {raffleResults.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4 text-center">ยังไม่มีบันทึกการสุ่มรางวัลในรอบนี้</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-slate-950 rounded-xl bg-slate-950/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-850">
                      <th className="p-2.5">ผู้ได้รับรางวัล</th>
                      <th className="p-2.5">ของรางวัล</th>
                      <th className="p-2.5">เวลาที่บันทึก</th>
                      <th className="p-2.5">วิธีแจก</th>
                      {isAdmin && <th className="p-2.5 text-right">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {raffleResults.map(res => (
                      <tr key={res.id} className="hover:bg-slate-850/20">
                        <td className="p-2.5 font-bold text-slate-200">🏆 {res.winnerName}</td>
                        <td className="p-2.5 font-extrabold text-blue-400">{res.prizeName}</td>
                        <td className="p-2.5 text-[10px] text-slate-500">
                          {new Date(res.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            res.itemType === 'raffle' ? 'bg-purple-950 text-purple-400 border border-purple-500/10' : 'bg-blue-950 text-blue-400 border border-blue-500/10'
                          }`}>
                            {res.itemType === 'raffle' ? 'หมุนวงล้อสด' : 'เฉลี่ยแบ่งแจก'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRaffleResult(res.id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                              title="ลบบันทึกประวัตินี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* WHITELIST SETUP MODAL */}
        {isWhitelistModalOpen && whitelistTargetDrop && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-scale-in text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm">ตั้งค่าระบบ Whitelist ไอเทม</h3>
                    <p className="text-[10px] text-slate-400">
                      เฉพาะผู้มีรายชื่ออาชีพหรือรหัสสมาชิกที่เลือกจะมีสิทธิ์ในการลุ้นสุ่มหรือจัดสรรไอเทมนี้
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsWhitelistModalOpen(false);
                    setWhitelistTargetDrop(null);
                  }}
                  className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Drop Info */}
              {(() => {
                const event = state.events.find(e => e.id === whitelistTargetDrop.eventId);
                const drop = event?.drops?.find(d => d.id === whitelistTargetDrop.dropId);
                if (!drop) return null;

                const jobClassesList = state.jobClasses && state.jobClasses.length > 0 ? state.jobClasses : DEFAULT_JOB_CLASSES;

                return (
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center">
                      <span className="font-extrabold text-blue-400 text-[13px]">💎 {drop.itemName}</span>
                      <span className="bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded text-[10px] font-mono">จำนวน {drop.quantity} ชิ้น</span>
                    </div>

                    {/* 1. Job Class Whitelist */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">1. กรองสิทธิ์ตามอาชีพ (Job Class Whitelist):</span>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        *หากไม่มีการเลือกอาชีพใดเลย ระบบจะอนุญาตให้สิทธิ์แก่ทุกอาชีพเป็นค่าเริ่มต้น
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {jobClassesList.map(cls => {
                          const isSelected = selectedWhitelistClasses.includes(cls);
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedWhitelistClasses(selectedWhitelistClasses.filter(c => c !== cls));
                                } else {
                                  setSelectedWhitelistClasses([...selectedWhitelistClasses, cls]);
                                }
                              }}
                              className={`p-2 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                                  : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800'
                              }`}
                            >
                              <span className="truncate">{cls}</span>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                readOnly 
                                className="w-3 h-3 rounded text-blue-600 accent-blue-500" 
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Specific Member Whitelist */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">2. ระบุตัวสมาชิกเฉพาะเจาะจง (Member Whitelist):</span>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        *หากเลือกรายชื่อสมาชิก ระบบจะบังคับให้สิทธิ์เฉพาะเจาะจงแก่สมาชิกที่ถูกเลือกกลุ่มนี้เท่านั้น
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-850">
                        {state.members.length === 0 ? (
                          <p className="col-span-2 text-xs text-slate-600 italic text-center py-4">ไม่มีรายชื่อสมาชิกในระบบ</p>
                        ) : (
                          state.members.map(m => {
                            const isSelected = selectedWhitelistMembers.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedWhitelistMembers(selectedWhitelistMembers.filter(id => id !== m.id));
                                  } else {
                                    setSelectedWhitelistMembers([...selectedWhitelistMembers, m.id]);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border text-left font-semibold transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                                    : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800'
                                }`}
                              >
                                <div className="truncate flex flex-col">
                                  <span className="font-bold text-[10.5px] text-slate-200 leading-tight">{m.name}</span>
                                  <span className="text-[9px] text-slate-500">{m.jobClass || 'ยังไม่ได้ระบุคลาส'}</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  readOnly 
                                  className="w-2.5 h-2.5 rounded text-indigo-600 accent-indigo-500" 
                                />
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsWhitelistModalOpen(false);
                    setWhitelistTargetDrop(null);
                  }}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveWhitelist}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  บันทึกตั้งค่า Whitelist
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
