import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, GraduationCap, Building2, Edit, Hash, ShieldCheck } from "lucide-react";
import { useProfile } from "../hooks/userProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyProfile() {
  const { profile, load, loading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, [load]);

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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* 🚀 Tactical Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">Identity <span className="text-primary">Intelligence</span></h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em] mt-2 opacity-50">Surgical Profile Verification & Status</p>
        </div>
        {!roleInfo?.read_only && (
          <button
            onClick={() => navigate('/settings/profile')}
            className="flex items-center gap-3 px-6 py-3 glass bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all group"
          >
            <Edit className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            Recalibrate Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 🎭 Identity Card */}
        <div className="lg:col-span-1 space-y-6">
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

              {/* Professional Network Stats */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/5">
                <div className="text-center group cursor-pointer">
                  <p className="text-2xl font-black text-white group-hover:text-primary transition-colors">{Math.floor(Math.random() * 500) + 50}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Followers</p>
                </div>
                <div className="text-center group cursor-pointer">
                  <p className="text-2xl font-black text-white group-hover:text-primary transition-colors">{Math.floor(Math.random() * 300) + 20}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Following</p>
                </div>
                <div className="text-center group cursor-pointer">
                  <p className="text-2xl font-black text-white group-hover:text-primary transition-colors">{Math.floor(Math.random() * 50) + 5}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Connections</p>
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
        <div className="lg:col-span-2 space-y-8">
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
                  .map(([key, attr]: [string, any]) => (
                    <AcademicStatCard
                      key={key}
                      icon={<Building2 />}
                      label={attr.label || key}
                      value={attr.value}
                    />
                  ))
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
    </div>
  );
}

const AcademicStatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: any }) => (
  <div className="glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/10 transition-all flex flex-col justify-between h-full bg-white/[0.01]">
    <div className="flex items-center justify-between mb-4 opacity-30">
      <p className="text-[10px] font-black text-white uppercase tracking-widest">{label}</p>
      {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
    </div>
    <p className="text-xl font-bold text-white uppercase tracking-tight">
      {typeof value === 'object' ? value?.value : (value || 'Not Assigned')}
    </p>
  </div>
);
