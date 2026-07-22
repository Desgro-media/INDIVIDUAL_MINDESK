import api from "./api";

export interface StaffMember {
    id: number;
    name: string;
    username: string;
    jobTitle: string | null;
    role: string; // ROLE_PSYCHOLOGIST | ROLE_RECEPTIONIST | ROLE_STAFF
    permissions: string[];
    bio: string | null;
    bookable: boolean;
    profileImageUrl: string | null;
    enabled: boolean;
    createdAt: string;
}

export interface AttendanceRecord {
    id: number;
    staffId: number;
    staffName: string;
    staffUsername: string;
    staffJobTitle: string | null;
    loginTime: string;
    logoutTime: string | null;
    workMinutes: number | null;
    date: string;
}

export interface CreateStaffPayload {
    name: string;
    username: string;
    password: string;
    jobTitle?: string;
    role: string;
    permissions: string[];
    bio?: string;
    bookable?: boolean;
    profileImageUrl?: string;
}

export type UpdateStaffPayload = Partial<Omit<CreateStaffPayload, "username">>;

export const getAllStaff = () => api.get<StaffMember[]>("/staff").then(r => r.data);

export const createStaff = (payload: CreateStaffPayload) =>
    api.post<StaffMember>("/staff", payload).then(r => r.data);

export const updateStaff = (id: number, payload: UpdateStaffPayload) =>
    api.put<StaffMember>(`/staff/${id}`, payload).then(r => r.data);

export const updatePermissions = (id: number, permissions: string[]) =>
    api.put<StaffMember>(`/staff/${id}/permissions`, permissions).then(r => r.data);

export const updateStaffDetails = (id: number, details: { name?: string; role?: string }) =>
    api.patch<StaffMember>(`/staff/${id}/details`, details).then(r => r.data);

// "Delete" deactivates — see StaffService.deactivateStaff. Blocks login and
// public bookability without losing historical appointment/invoice/note
// attribution.
export const deactivateStaff = (id: number) =>
    api.delete<StaffMember>(`/staff/${id}`).then(r => r.data);

export const reactivateStaff = (id: number) =>
    api.post<StaffMember>(`/staff/${id}/reactivate`).then(r => r.data);

export const getAllAttendance = () => api.get<AttendanceRecord[]>("/staff/attendance").then(r => r.data);

export const getActiveStaff = () => api.get<AttendanceRecord[]>("/staff/attendance/active").then(r => r.data);

export const getAttendanceByDate = (date: string) =>
    api.get<AttendanceRecord[]>(`/staff/attendance/date/${date}`).then(r => r.data);

export const getAttendanceForStaff = (staffId: number) =>
    api.get<AttendanceRecord[]>(`/staff/attendance/staff/${staffId}`).then(r => r.data);
