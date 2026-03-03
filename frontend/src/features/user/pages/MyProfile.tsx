import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, GraduationCap, Building2, Edit, Hash, ShieldCheck, X, Users, UserMinus, MessageSquare } from "lucide-react";
import { useProfile } from "../hooks/userProfile";
import { socialApi } from "@/features/social/api";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

export default function MyProfile() {
  const { profile, load, loading } = useProfile();
  const navigate = useNavigate();
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [showModal, setShowModal] = useState<'followers' | 'following' | 'connections' | null>(null);
  const [connections, setConnections] = useState<any>({ followers: [], following: [], connections: [] });
  const [modalLoading, setModalLoading] = useState(false);

  const loadNetwork = useCallback(async () => {
    try {
      const stats = await socialApi.getNetworkStats();
      setNetworkStats(stats);
    } catch (e) { console.error("Stats failed", e); }
  }, []);

  useEffect(() => {
    load();
    loadNetwork();
  }, [load, loadNetwork]);

  const openConnections = async (type: 'followers' | 'following' | 'connections') => {
    setShowModal(type);
    setModalLoading(true);
    try {
      const data = await socialApi.getDetailedConnections();
      setConnections(data);
    } catch (e) {
      toast.error("Failed to load connections");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDisconnect = async (connId: number) => {
    try {
      await socialApi.disconnectUser(connId);
      toast.success("Connection removed");
      // Refresh
      const data = await socialApi.getDetailedConnections();
      setConnections(data);
      loadNetwork();
    } catch (e) {
      toast.error("Failed to disconnect");
    }
  };

  if (loading || !profile)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest animate-pulse">Synchronizing Identity...</p>
        </div>
      </div>
    );

  const user = profile.user;
  const roleInfo = profile.role_info;
  const role = user.role?.toLowerCase();

  return (
    <div className="space-y-6 md:space-y-10 p-2 md:p-6 min-h-screen bg-[#050505] text-white selection:bg-primary/30 w-full overflow-x-hidden animate-in fade-in duration-700">
      {/* 🚀 Tactical Header */}
      <div className="glass p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-visible flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white italic tracking-tighter uppercase leading-none truncate">Identity <span className="text-primary not-italic">Intelligence</span></h1>
          <p className="text-muted-foreground text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] mt-2 opacity-50">Surgical Profile Verification & Status</p>
        </div>
        {!roleInfo?.read_only && (
          <button
            onClick={() => navigate('/settings/profile')}
            className="flex items-center gap-3 px-6 py-3 bg-primary border border-primary/20 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all group shrink-0"
          >
            <Edit className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            Recalibrate Profile
          </button>
        )}
      </div>

      <div className="flex flex-col 2xl:flex-row gap-8">
        {/* 🎭 Identity Card */}
        <div className="w-full 2xl:w-[440px] shrink-0 space-y-6">
          <div className="glass p-8 rounded-[3rem] border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent text-center space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full glass bg-white/5 border-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                <User className="w-16 h-16 text-primary" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase italic">
                {roleInfo?.full_name?.value || `${user.first_name || user.username} ${user.last_name || ''}`}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{user.role}</p>
              </div>

              {/* Premium Professional Network Stats */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-10 mt-8 pt-6 border-t border-white/5">
                <div
                  onClick={() => openConnections('followers')}
                  className="flex flex-col items-center group cursor-pointer hover:scale-105 transition-all duration-300 min-w-[70px]"
                >
                  <p className="text-xl md:text-2xl lg:text-3xl font-black text-white group-hover:text-primary transition-colors">
                    {networkStats?.followers_count || 0}
                  </p>
                  <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">Followers</p>
                </div>

                <div className="w-px h-8 bg-white/5 shrink-0" />

                <div
                  onClick={() => openConnections('following')}
                  className="flex flex-col items-center group cursor-pointer hover:scale-105 transition-all duration-300 min-w-[70px]"
                >
                  <p className="text-xl md:text-2xl lg:text-3xl font-black text-white group-hover:text-primary transition-colors">
                    {networkStats?.following_count || 0}
                  </p>
                  <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">Following</p>
                </div>

                <div className="w-px h-8 bg-white/5 shrink-0" />

                <div
                  onClick={() => openConnections('connections')}
                  className="flex flex-col items-center group relative cursor-pointer hover:scale-105 transition-all duration-300 min-w-[70px]"
                >
                  <div className="absolute -inset-2 bg-primary/5 rounded-full blur-lg group-hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100" />
                  <p className="text-xl md:text-2xl lg:text-3xl font-black text-white relative group-hover:text-primary transition-colors">
                    {networkStats?.friends_count || 0}
                  </p>
                  <p className="text-[8px] md:text-[9px] text-primary font-black uppercase tracking-widest mt-1 relative opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">Conns</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-3 text-white/50 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <Mail className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold truncate">{user.email}</p>
              </div>
              {roleInfo?.roll_number?.value && (
                <div className="flex items-center gap-3 text-white/70 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                  <Hash className="w-4 h-4 text-primary" />
                  <p className="text-xs font-black tracking-widest uppercase">
                    {roleInfo.roll_number.value}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-white/[0.01]">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6 px-1">Security Reputation</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-1">
                <span className="text-[10px] font-bold text-white/30 uppercase">Status</span>
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Active Scan</span>
              </div>
              <div className="flex items-center justify-between p-1">
                <span className="text-[10px] font-bold text-white/30 uppercase">Schema</span>
                <span className="text-[10px] font-black text-white uppercase tracking-tighter italic">Localized Isolated</span>
              </div>
            </div>
          </div>
        </div>

        {/* 📚 Academic Intelligence (Grid) */}
        <div className="flex-1 space-y-8 min-w-0">
          {roleInfo?.intelligence_mode === "DYNAMIC" ? (
            <div className="space-y-8">
              {/* Feature CGPA if it exists in dynamic data */}
              {roleInfo.cgpa && (
                <div className="glass p-10 rounded-[3.5rem] border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-primary/10 transition-all">
                  <div className="space-y-2 text-center md:text-left">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Academic Performance Intelligence</p>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Cumulative Grade Point Equivalent</h3>
                  </div>
                  <div className="text-center">
                    <p className="text-7xl font-black text-white italic tracking-tighter leading-none">{roleInfo.cgpa.value}</p>
                    <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mt-2 px-2 py-1 bg-primary/10 rounded-full">Synchronized State</p>
                  </div>
                </div>
              )}

              {/* Dynamic Grid for all other attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(roleInfo)
                  .filter(([key]) => !['read_only', 'intelligence_mode', 'cgpa', 'full_name', 'roll_number', 'employee_id'].includes(key))
                  .map(([key, attr]: [string, any]) => {
                    // Smart Icon Selection
                    let Icon = Building2;
                    const k = key.toLowerCase();
                    if (k.includes('email')) Icon = Mail;
                    if (k.includes('semester')) Icon = Hash;
                    if (k.includes('phone')) Icon = Hash;
                    if (k.includes('birth') || k.includes('date')) Icon = Calendar;
                    if (k.includes('program') || k.includes('branch') || k.includes('dept')) Icon = GraduationCap;
                    if (k.includes('section')) Icon = Users;

                    return (
                      <AcademicStatCard
                        key={key}
                        icon={<Icon />}
                        label={attr.label || key.replace(/_/g, ' ')}
                        value={attr.value}
                      />
                    );
                  })
                }
              </div>
            </div>
          ) : role === "faculty" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AcademicStatCard icon={<Building2 />} label="Professional Designation" value={roleInfo.designation} />
              <AcademicStatCard icon={<GraduationCap />} label="Academic Department" value={roleInfo.department} />
            </div>
          ) : (
            <div className="glass p-12 rounded-[3.5rem] border-white/5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 glass bg-white/5 border-white/10 rounded-[1.5rem] flex items-center justify-center text-white/20">
                <Building2 className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Administrative Identity Platform View</p>
            </div>
          )}

          {/* 🛡️ Read-Only Surgical Enforcement Footer */}
          {roleInfo?.read_only && (
            <div className="glass p-8 rounded-[2.5rem] border-red-500/20 bg-red-500/[0.02] flex items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 animate-pulse">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Institutional Identity Protection In Effect</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed mt-1">
                  Your profile details are strictly synced from the institutional source of truth.
                  Modification permissions are restricted to maintain data integrity.
                  If you notice an alignment failure, please contact the <span className="text-white font-bold">University Registrar</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConnectionsModal
        isOpen={!!showModal}
        onClose={() => setShowModal(null)}
        type={showModal || 'followers'}
        list={showModal ? connections[showModal] : []}
        loading={modalLoading}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}

const ConnectionsModal = ({ isOpen, onClose, type, list, loading, onDisconnect }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-3xl glass p-8 rounded-[3rem] border-white/10 shadow-3xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Manage <span className="text-primary">{type}</span>
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Surgical Professional Network Overlook</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 glass bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Accessing Node Registry...</p>
            </div>
          ) : list.length > 0 ? (
            list.map((node: any) => (
              <div key={`${node.role}-${node.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 glass-dark rounded-2xl border border-white/5 group hover:border-primary/20 transition-all gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      {node.avatar}
                    </div>
                    {node.is_online && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0a] shadow-lg animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" title={node.name}>{node.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-full">{node.role}</p>
                      {node.is_online ? (
                        <span className="text-[8px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1 h-1 bg-green-400 rounded-full" /> Live
                        </span>
                      ) : node.last_seen && (
                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tight">Seen {new Date(node.last_seen).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {node.status === 'FRIENDS' && (
                    <button
                      onClick={() => window.location.href = `/chat-hub?peer=${node.id}&role=${node.role}`}
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase rounded-xl border border-primary/20 transition-all shadow-lg"
                      title="Instant Collaboration"
                    >
                      <MessageSquare className="w-4 h-4" /> Message
                    </button>
                  )}
                  <button
                    onClick={() => onDisconnect(node.connection_id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-xl border border-red-500/20 transition-all shadow-lg hover:shadow-red-500/20"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Terminate
                  </button>
                </div>
              </div>
            ))

          ) : (
            <div className="py-20 text-center opacity-30">
              <Users className="w-12 h-12 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No nodes found in this sector</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AcademicStatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: any }) => (
  <div className="glass p-6 md:p-8 rounded-[2.5rem] border-white/5 hover:border-white/10 transition-all flex flex-col justify-between h-full bg-white/[0.01] min-w-0">
    <div className="flex items-center justify-between mb-4 opacity-30">
      <p className="text-[10px] font-black text-white uppercase tracking-widest truncate mr-2" title={label}>{label}</p>
      {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 shrink-0" })}
    </div>
    <p className="text-sm md:text-base lg:text-xl font-bold text-white uppercase tracking-tight break-all">
      {typeof value === 'object' ? value?.value : (value || 'N/A')}
    </p>
  </div>
);
