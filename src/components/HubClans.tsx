import React, { useState, useEffect } from 'react';
import { mockDb, type User, type GameState, type Clan } from '../services/mockDb';
import { backendService } from '../services/backendService';
import { audioEngine } from './AudioEngine';

interface HubClansProps {
  playerUser: User;
  gameState: GameState;
  onStateUpdate: (newState: GameState) => void;
  onSelectZone: (zone: 'forest' | 'volcano' | 'unified') => void;
}

export const HubClans: React.FC<HubClansProps> = ({
  playerUser,
  gameState,
  onStateUpdate,
  onSelectZone
}) => {
  // Clan Management states
  const [clansList, setClansList] = useState<Clan[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanMotto, setNewClanMotto] = useState('');
  const [newClanBadge, setNewClanBadge] = useState('🛡️');
  const [clanSuccess, setClanSuccess] = useState<string | null>(null);
  const [clanError, setClanError] = useState<string | null>(null);
  const [expandedClanId, setExpandedClanId] = useState<string | null>(null);

  const loadClans = async () => {
    const board = await backendService.getClanLeaderboard();
    setClansList(board);
    try {
      const users = await backendService.getUsers();
      setAllUsersList(users);
    } catch (err) {
      console.error('Error loading users in loadClans:', err);
    }
  };

  useEffect(() => {
    loadClans();
  }, [gameState.clanId]);

  const handleApplyToClan = async (clanId: string, clanName: string) => {
    if (window.confirm(`Deseja se candidatar para entrar no clã ${clanName}?`)) {
      audioEngine.playCorrect();
      await backendService.applyToClan(playerUser.id, clanId);
      await loadClans();
      setClanSuccess(`Candidatura enviada para ${clanName}!`);
      setTimeout(() => { setClanSuccess(null); }, 4000);
    }
  };

  const handleAcceptApplication = async (clanId: string, candidateId: string) => {
    audioEngine.playCorrect();
    await backendService.acceptApplication(playerUser.id, clanId, candidateId);
    await loadClans();
  };

  const handleRejectApplication = async (clanId: string, candidateId: string) => {
    audioEngine.playError();
    await backendService.rejectApplication(playerUser.id, clanId, candidateId);
    await loadClans();
  };

  const handleKickMember = async (clanId: string, targetId: string) => {
    if (window.confirm('Tem certeza que deseja expulsar este membro?')) {
      audioEngine.playError();
      await backendService.kickMember(playerUser.id, clanId, targetId);
      await loadClans();
    }
  };

  const handleTransferLeadership = async (clanId: string, targetId: string) => {
    if (window.confirm('Tem certeza que deseja passar a liderança para este membro? Você voltará a ser um membro comum.')) {
      audioEngine.playCorrect();
      await backendService.transferLeadership(playerUser.id, clanId, targetId);
      await loadClans();
    }
  };

  const handleLeaveClan = async () => {
    if (window.confirm('Tem certeza de que deseja sair de seu clã atual?')) {
      audioEngine.playCorrect();
      const updated = await backendService.leaveClan(playerUser.id);
      if (updated) {
        onStateUpdate(updated);
        await loadClans();
        setClanSuccess('Você saiu do clã.');
        setTimeout(() => { setClanSuccess(null); }, 4000);
      } else {
        audioEngine.playError();
        setClanError('Erro ao sair do clã.');
        setTimeout(() => { setClanError(null); }, 4000);
      }
    }
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClanName.trim() || !newClanTag.trim() || !newClanMotto.trim()) {
      audioEngine.playError();
      setClanError('Por favor, preencha todos os campos do clã.');
      setTimeout(() => { setClanError(null); }, 4000);
      return;
    }

    if (newClanTag.trim().length > 4) {
      audioEngine.playError();
      setClanError('A TAG do clã deve ter no máximo 4 caracteres.');
      setTimeout(() => { setClanError(null); }, 4000);
      return;
    }

    const updated = await backendService.createClan(playerUser.id, newClanName, newClanTag, newClanMotto, newClanBadge);
    if (updated) {
      onStateUpdate(updated);
      await loadClans();
      setClanSuccess(`Clã "${newClanName}" criado com sucesso!`);
      setNewClanName('');
      setNewClanTag('');
      setNewClanMotto('');
      setTimeout(() => { setClanSuccess(null); }, 4000);
    } else {
      audioEngine.playError();
      setClanError('Erro ao criar clã. Nome ou TAG já podem estar em uso.');
      setTimeout(() => { setClanError(null); }, 4000);
    }
  };

  const isClansLocked = gameState.auraLevel < 15 && gameState.rebirths === 0;
  if (isClansLocked) {
    return (
      <div className="cyber-card" style={{ borderColor: 'var(--neon-pink)', textAlign: 'center', padding: '40px 20px', background: 'rgba(244, 63, 94, 0.03)' }}>
        <h3 className="text-glow-pink" style={{ fontSize: '1.4rem', color: 'var(--neon-pink)', marginBottom: '14px' }}>
          🔒 Alianças e Clãs (Bloqueado)
        </h3>
        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: '1.5rem' }}>
          Esta funcionalidade social requer **Nível de Aura 15** ou pelo menos **1 Rebirth** para ser despertada.
        </p>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(15,23,42,0.4)', padding: '12px 24px', borderRadius: '8px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.05)' }}>
          Sua Aura Atual: <strong style={{ color: 'var(--neon-cyan)' }}>Nível {gameState.auraLevel}</strong> • Rebirths: <strong style={{ color: 'var(--neon-pink)' }}>{gameState.rebirths}</strong>
        </div>
      </div>
    );
  }

  const myClan = gameState.clanId ? clansList.find(c => c.id === gameState.clanId) : null;

  return (
    <div className="cyber-card" style={{ borderColor: 'var(--neon-pink)' }}>
      <h3 className="text-glow-pink" style={{ fontSize: '1.4rem', marginBottom: '10px', color: 'var(--neon-pink)' }}>
        🛡️ Alianças e Clãs Estudantis
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
        Una forças com seus colegas de classe! Crie ou entre em um clã de matemática para acumular pontos coletivos e dominar os rankings escolares da gincana!
      </p>

      {/* Explanatory Banner */}
      <div style={{
        background: 'rgba(244, 63, 94, 0.08)',
        border: '1px dashed rgba(244, 63, 94, 0.3)',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '0.85rem',
        lineHeight: '1.45rem',
        textAlign: 'left'
      }}>
        <strong style={{ color: '#f43f5e', display: 'block', fontSize: '0.9rem', marginBottom: '6px', textShadow: '0 0 6px rgba(244,63,94,0.4)' }}>
          🛡️ Como a Cooperação em Clãs ajuda a Evoluir?
        </strong>
        1. <strong>Participação:</strong> Crie seu próprio clã por 50 gemas ou candidate-se a um clã existente para começar a colaborar.
        <br />
        2. <strong>Bônus de Clã:</strong> Cada nível alcançado pelo clã concede um <strong>Multiplicador de XP e Gemas (+2% por nível)</strong> permanente a todos os seus membros!
        <br />
        3. <strong>Evolução Coletiva:</strong> Acumule pontos jogando e vencendo desafios na Arena para evoluir o nível do clã e conquistar os rankings gerais.
      </div>

      {clanSuccess && (
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
          {clanSuccess}
        </div>
      )}

      {clanError && (
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
          {clanError}
        </div>
      )}

      {/* Clan Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Left side: Player's Current Clan or Join/Create tabs */}
        <div>
          {myClan ? (() => {
             const allUsers = allUsersList.length > 0 ? allUsersList : mockDb.getUsers();
             const clanMembers = allUsers.filter(u => myClan.members.includes(u.id));

             return (
               <div className="cyber-card" style={{ borderColor: 'var(--neon-pink)', background: 'rgba(244, 63, 94, 0.08)', padding: '16px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                   <span style={{ fontSize: '3rem' }}>{myClan.badgeEmoji}</span>
                   <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{myClan.name}</h4>
                       <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', fontWeight: 800, border: '1px solid var(--neon-pink)', padding: '1px 6px', borderRadius: '4px' }}>
                         [{myClan.tag}]
                       </span>
                     </div>
                     <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>"{myClan.motto}"</p>
                   </div>
                 </div>

                 <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginBottom: '16px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                     <h5 style={{ fontSize: '0.9rem', color: '#fff' }}>🛡️ Nível do Clã: {myClan.level || 1}</h5>
                     <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', fontWeight: 'bold' }}>Bônus: +{(((myClan.level || 1) * 0.02) * 100).toFixed(0)}% XP/Gemas</span>
                   </div>
                   <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '4px', height: '8px', width: '100%', marginBottom: '16px', overflow: 'hidden' }}>
                     <div style={{ height: '100%', width: `${Math.min(((myClan.xp || 0) / ((myClan.level || 1) * 500)) * 100, 100)}%`, background: 'var(--neon-pink)', transition: 'width 0.3s ease' }}></div>
                   </div>

                   <h5 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '10px' }}>👥 Membros do Clã ({clanMembers.length}):</h5>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                     {clanMembers.map(member => {
                       const mState = mockDb.getGameState(member.id);
                       const isLeader = myClan.leaderId === member.id;
                       return (
                         <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.4)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                             {isLeader && <span title="Líder do Clã">👑</span>}
                             <span style={{ color: member.id === playerUser.id ? 'var(--neon-pink)' : '#fff', fontWeight: member.id === playerUser.id ? 800 : 500 }}>
                               {member.username} {member.id === playerUser.id ? '(Você)' : ''}
                             </span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                               Nvl Aura {mState?.auraLevel || 1} • ⭐ {mState?.rebirths || 0}
                             </span>
                             {myClan.leaderId === playerUser.id && member.id !== playerUser.id && (
                               <div style={{ display: 'flex', gap: '4px' }}>
                                 <button onClick={() => handleTransferLeadership(myClan.id, member.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="Promover a Líder">👑</button>
                                 <button onClick={() => handleKickMember(myClan.id, member.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }} title="Expulsar">👢</button>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                 {myClan.leaderId === playerUser.id && (
                   <div style={{ marginBottom: '16px', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '12px', borderRadius: '8px' }}>
                     <h5 style={{ fontSize: '0.85rem', color: 'var(--neon-yellow)', marginBottom: '8px' }}>👑 Painel do Líder / Candidaturas:</h5>
                     {(myClan.joinRequests?.length || 0) === 0 ? (
                       <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', margin: 0 }}>
                         Nenhum pedido de entrada pendente.
                       </p>
                     ) : (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         {myClan.joinRequests.map((reqId: string) => {
                           const user = allUsersList.find(u => u.id === reqId) || mockDb.getUsers().find(u => u.id === reqId);
                           if (!user) return null;
                           return (
                             <div key={reqId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                               <span style={{ fontSize: '0.8rem', color: '#fff' }}>{user.username}</span>
                               <div style={{ display: 'flex', gap: '6px' }}>
                                 <button onClick={() => handleAcceptApplication(myClan.id, reqId)} style={{ background: 'var(--neon-cyan)', color: '#000', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Aceitar</button>
                                 <button onClick={() => handleRejectApplication(myClan.id, reqId)} style={{ background: 'var(--neon-pink)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Recusar</button>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     )}
                   </div>
                 )}
                 {/* Cooperative Boss Card */}
                 <div style={{ marginBottom: '16px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '12px', borderRadius: '8px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                     <h5 style={{ fontSize: '0.85rem', color: 'var(--neon-purple)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                       ⚔️ Chefe do Clã Cooperativo:
                     </h5>
                     <span style={{ fontSize: '0.75rem', color: '#fff', backgroundColor: 'var(--neon-purple)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                       Nvl {myClan.bossLevel || 1}
                     </span>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                     <span style={{ fontSize: '2rem' }}>
                       {(myClan.bossLevel || 1) % 3 === 1 ? '🤖' : (myClan.bossLevel || 1) % 3 === 2 ? '🐉' : '👹'}
                     </span>
                     <div>
                       <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>
                         {(myClan.bossLevel || 1) % 3 === 1 ? 'Matemoticão de Ferro' : (myClan.bossLevel || 1) % 3 === 2 ? 'Dragão de Frações' : 'Monstro Algébrico'}
                       </div>
                       <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                         HP: {myClan.bossHp ?? 5000} / {myClan.bossMaxHp ?? 5000}
                       </div>
                     </div>
                   </div>

                   {/* Health Bar */}
                   <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '4px', height: '10px', width: '100%', overflow: 'hidden', marginBottom: '10px' }}>
                     <div
                       style={{
                         height: '100%',
                         width: `${Math.max(0, Math.min(100, (((myClan.bossHp ?? 5000) / (myClan.bossMaxHp ?? 5000)) * 100)))}%`,
                         background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                         transition: 'width 0.3s ease'
                       }}
                     />
                   </div>

                   <button
                     className="cyber-btn"
                     onClick={() => {
                       audioEngine.playCorrect();
                       onSelectZone('volcano'); // Launching battle arena, which allows damaging the boss on correct hits.
                     }}
                     style={{
                       width: '100%',
                       padding: '8px',
                       fontSize: '0.8rem',
                       borderColor: 'var(--neon-purple)',
                       background: 'rgba(168, 85, 247, 0.15)',
                       marginBottom: '8px',
                       fontWeight: 800
                     }}
                   >
                     ⚔️ Iniciar Combate na Arena
                   </button>

                   <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', margin: 0, fontStyle: 'italic' }}>
                     *Resolva contas na Arena de Combate para causar dano ao chefe cooperativo!
                   </p>
                 </div>

                 <button
                   className="cyber-btn cyber-btn-pink"
                   onClick={handleLeaveClan}
                   style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                 >
                   🚪 Sair do Clã
                 </button>
               </div>
             );
          })() : (
            /* Create Clan Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="cyber-card" style={{ background: 'rgba(15,23,42,0.4)', padding: '16px' }}>
                <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  ➕ Criar um Novo Clã
                </h4>
                
                <form onSubmit={handleCreateClan} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Nome do Clã:</label>
                      <input type="text" value={newClanName} onChange={e => { setNewClanName(e.target.value); }} placeholder="Ex: Math Titans" maxLength={20} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>TAG (TNS):</label>
                      <input type="text" value={newClanTag} onChange={e => { setNewClanTag(e.target.value); }} placeholder="Ex: TNS" maxLength={4} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem', textTransform: 'uppercase' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Lema do Clã:</label>
                    <input type="text" value={newClanMotto} onChange={e => { setNewClanMotto(e.target.value); }} placeholder="Ex: Resolver até o infinito!" maxLength={40} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }} />
                  </div>

                  <div style={{ display: 'flex', justifyItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>Emblema:</label>
                      <select value={newClanBadge} onChange={e => { setNewClanBadge(e.target.value); }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: '#0b0f19', color: '#fff', fontSize: '0.85rem' }}>
                        <option value="🛡️">🛡️ Escudo Cósmico</option>
                        <option value="🔥">🔥 Chama de Aura</option>
                        <option value="👑">👑 Coroa de Ouro</option>
                        <option value="⚡">⚡ Raio Elétrico</option>
                        <option value="🦄">🦄 Pégaso Mágico</option>
                      </select>
                    </div>
                    <button type="submit" className="cyber-btn" style={{ flex: 1, height: '36px', marginTop: '18px', padding: '0', fontSize: '0.85rem', borderColor: 'var(--neon-pink)', background: 'rgba(244,63,94,0.1)' }}>
                      Criar Clã
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right side: Active Clans List & Leaderboard ranking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            🏆 Ranking Geral de Clãs
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {clansList.map((clan, index) => {
              const isMyClan = gameState.clanId === clan.id;
              const isExpanded = expandedClanId === clan.id;
              const bossLvl = clan.bossLevel || 1;
              
              return (
                <div
                  key={clan.id}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: isMyClan ? '1.5px solid var(--neon-pink)' : '1px solid rgba(255,255,255,0.05)',
                    background: isMyClan ? 'rgba(244, 63, 94, 0.08)' : 'rgba(15, 23, 42, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setExpandedClanId(isExpanded ? null : clan.id); }}
                >
                  {/* Main Row / Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: 'rgba(255,255,255,0.65)', minWidth: '20px' }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontSize: '1.6rem' }}>{clan.badgeEmoji}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>{clan.name}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--neon-pink)' }}>[{clan.tag}]</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                          {clan.members.length} {clan.members.length === 1 ? 'membro' : 'membros'}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--neon-pink)' }}>
                          Nível {clan.level || 1}
                        </strong>
                        <strong style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                          ⭐ {clan.totalRebirths}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', userSelect: 'none' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div
                      onClick={(e) => { e.stopPropagation(); }}
                      style={{
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '8px',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'default',
                      }}
                    >
                      {clan.motto && (
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: '0 0 2px 0' }}>
                          "{clan.motto}"
                        </p>
                      )}

                      {/* Passive bonus info */}
                      <div style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', borderLeft: '3px solid var(--neon-pink)' }}>
                        <span style={{ color: 'var(--neon-pink)', fontWeight: 'bold' }}>✨ Bônus de XP/Gemas:</span> +{(clan.level || 1) * 2}% multiplicador de recompensa.
                      </div>

                      {/* Clan Boss Status */}
                      <div style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--neon-purple)' }}>⚔️ Chefe: Nvl {bossLvl}</span>
                          <span>HP: {clan.bossHp ?? 5000} / {clan.bossMaxHp ?? 5000}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '2px', height: '6px', width: '100%', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(0, Math.min(100, (((clan.bossHp ?? 5000) / (clan.bossMaxHp ?? 5000)) * 100)))}%`,
                              background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Conquistas (Achievements) */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {clan.level >= 5 && <span style={{ fontSize: '0.65rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-yellow)' }} title="Clã Nível 5+">🛡️ Guardião</span>}
                        {clan.level >= 10 && <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-blue)' }} title="Clã Nível 10+">🔮 Místico</span>}
                        {bossLvl > 1 && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-pink)' }} title={`Derrotou ${bossLvl - 1} chefes`}>
                            ⚔️ {bossLvl - 1} Derrotado{(bossLvl - 1) > 1 ? 's' : ''}
                          </span>
                        )}
                        {clan.totalRebirths >= 10 && <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--neon-purple)' }} title="Mais de 10 Rebirths somados">⭐ Poder Coletivo</span>}
                      </div>

                      {/* Members list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
                          👥 Membros ({clan.members.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                          {clan.members.map((memberId) => {
                            const allUsers = allUsersList.length > 0 ? allUsersList : mockDb.getUsers();
                            const member = allUsers.find(u => u.id === memberId);
                            if (!member) return null;
                            const mState = mockDb.getGameState(member.id);
                            const isLeader = clan.leaderId === member.id;
                            return (
                              <div
                                key={memberId}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.7rem',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.02)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {isLeader && <span title="Líder do Clã">👑</span>}
                                  <span style={{ color: member.id === playerUser.id ? 'var(--neon-pink)' : '#fff', fontWeight: member.id === playerUser.id ? 800 : 500 }}>
                                    {member.username} {member.id === playerUser.id ? '(Você)' : ''}
                                  </span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem' }}>
                                  Nvl {mState?.auraLevel || 1} • ⭐ {mState?.rebirths || 0}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Application button if player is not in this clan and not in any clan */}
                      {(!gameState.clanId || !clansList.some(c => c.id === gameState.clanId)) && !isMyClan && (
                        <button
                          className="cyber-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyToClan(clan.id, clan.name);
                          }}
                          disabled={(clan.joinRequests || []).includes(playerUser.id)}
                          style={{ padding: '6px 10px', fontSize: '0.75rem', height: '28px', width: '100%', marginTop: '4px', opacity: (clan.joinRequests || []).includes(playerUser.id) ? 0.5 : 1 }}
                        >
                          {(clan.joinRequests || []).includes(playerUser.id) ? 'Candidatura Pendente ⏳' : 'Enviar Candidatura para o Clã 📝'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
