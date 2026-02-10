// ✅ View-Only Profile Display
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, GraduationCap, Building2, Edit } from "lucide-react";
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
      <div className="py-10 text-center text-gray-500">
        Loading profile…
      </div>
    );

  const user = profile.user;
  const roleInfo = profile.role_info;
  const role = user.role?.toLowerCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">View your account information</p>
        </div>
        <Button onClick={() => navigate('/settings/profile')}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Avatar & Name Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
              {user.first_name?.charAt(0) || user.username?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-gray-500">{user.username}</p>
              <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {user.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-Specific Information */}
      {role === "student" && roleInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleInfo.roll_number && (
              <div className="flex items-center gap-3 text-gray-700">
                <GraduationCap className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Roll Number</p>
                  <p className="font-medium">{roleInfo.roll_number}</p>
                </div>
              </div>
            )}
            {roleInfo.admission_year && (
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Admission Year</p>
                  <p className="font-medium">{roleInfo.admission_year}</p>
                </div>
              </div>
            )}
            {roleInfo.batch && (
              <div className="flex items-center gap-3 text-gray-700">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Batch</p>
                  <p className="font-medium">{roleInfo.batch}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === "teacher" && roleInfo?.department && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-gray-700">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{roleInfo.department}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
