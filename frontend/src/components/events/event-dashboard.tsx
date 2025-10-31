import { EventAttendee } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import CheckCircle from 'lucide-react/icons/check-circle';
import Users from 'lucide-react/icons/users';
import UserX from 'lucide-react/icons/user-x';
import ScanLine from 'lucide-react/icons/scan-line';
import Download from 'lucide-react/icons/download';
import TrendingUp from 'lucide-react/icons/trending-up';
import { format } from 'date-fns';

interface EventDashboardProps {
    attendees: EventAttendee[];
    eventId: string;
}

export default function EventDashboard({ attendees, eventId }: EventDashboardProps) {
    const { t } = useTranslation('events');
    const totalAttendees = attendees.length;
    const checkedInAttendees = attendees.filter(a => a.status === 'attended');
    const checkedInCount = checkedInAttendees.length;
    const remainingCount = totalAttendees - checkedInCount;
    const checkInRate = totalAttendees > 0 ? (checkedInCount / totalAttendees) * 100 : 0;

    const handleDownloadCSV = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.error("No access token found.");
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/reports/events/${eventId}/attendance.csv`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `event_${eventId}_attendance.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading CSV:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Total Registered Card */}
                <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('dashboard.total_registered')}</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalAttendees}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total registrations</p>
                    </CardContent>
                </Card>

                {/* Checked In Card */}
                <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('dashboard.checked_in')}</CardTitle>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{checkedInCount}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Attended event</p>
                    </CardContent>
                </Card>

                {/* Remaining Card */}
                <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('dashboard.remaining')}</CardTitle>
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                            <UserX className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{remainingCount}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Not checked in</p>
                    </CardContent>
                </Card>
            </div>

            {/* Attendee Status Card */}
            <Card className="border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="h-1.5 w-1.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
                                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.attendee_status_title')}</CardTitle>
                            </div>
                            <CardDescription className="text-gray-600 dark:text-gray-400">{t('dashboard.attendee_status_description')}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                onClick={handleDownloadCSV}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {t('dashboard.download_csv')}
                            </Button>
                            <Button 
                                asChild
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-300"
                            >
                                <Link href={`/dashboard/events/${eventId}/scan`}>
                                    <ScanLine className="mr-2 h-4 w-4" />
                                    {t('dashboard.scan_qr_button')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {/* Progress Section */}
                    <div className="mb-6 space-y-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-gray-900 dark:text-white">Check-in Progress</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{checkInRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={checkInRate} className="h-3 rounded-full" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('dashboard.progress_text', { checkedIn: checkedInCount, total: totalAttendees, rate: checkInRate.toFixed(1) })}
                        </p>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-200 dark:border-gray-700 hover:bg-transparent">
                                    <TableHead className="font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_attendee')}</TableHead>
                                    <TableHead className="font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_email')}</TableHead>
                                    <TableHead className="hidden sm:table-cell font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_checkin_time')}</TableHead>
                                    <TableHead className="hidden md:table-cell font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_checkin_method')}</TableHead>
                                    <TableHead className="hidden lg:table-cell font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_liveness_score')}</TableHead>
                                    <TableHead className="hidden lg:table-cell font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_face_confidence')}</TableHead>
                                    <TableHead className="hidden xl:table-cell font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_failure_reason')}</TableHead>
                                    <TableHead className="text-right font-bold text-gray-700 dark:text-gray-300">{t('dashboard.table_header_status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendees.length > 0 ? (
                                    attendees.sort((a, b) => (a.status === 'attended' === (b.status === 'attended')) ? 0 : (a.status === 'attended') ? -1 : 1).map(attendee => (
                                        <TableRow 
                                            key={attendee.id}
                                            className={`border-gray-200 dark:border-gray-700 transition-all duration-200 ${
                                                attendee.status === 'attended' 
                                                    ? 'hover:bg-green-50 dark:hover:bg-green-900/10' 
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="border-2 border-gray-200 dark:border-gray-700">
                                                        <AvatarImage src={attendee.user_profile_picture_url?.Valid ? attendee.user_profile_picture_url.String : ''} alt={attendee.user_name} />
                                                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">{attendee.user_name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="font-semibold text-gray-900 dark:text-white">{attendee.user_name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">{attendee.user_email}</TableCell>
                                            <TableCell className="hidden sm:table-cell text-gray-600 dark:text-gray-400">
                                                {attendee.checkin_time?.Valid ? format(new Date(attendee.checkin_time.Time), 'PPpp') : t('dashboard.status_na')}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-gray-600 dark:text-gray-400">
                                                {attendee.checkin_method?.Valid ? t(`dashboard.checkin_method_${attendee.checkin_method.String}`) : t('dashboard.status_na')}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-gray-600 dark:text-gray-400">
                                                {attendee.liveness_score?.Valid ? attendee.liveness_score.Float64.toFixed(2) : t('dashboard.status_na')}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-gray-600 dark:text-gray-400">
                                                {attendee.face_sample_quality_score?.Valid ? attendee.face_sample_quality_score.Float64.toFixed(2) : t('dashboard.status_na')}
                                            </TableCell>
                                            <TableCell className="hidden xl:table-cell text-gray-600 dark:text-gray-400">
                                                {attendee.failure_reason?.Valid ? attendee.failure_reason.String : t('dashboard.status_na')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {attendee.status === 'attended' ? (
                                                    <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold">
                                                        {t('dashboard.status_checked_in')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">
                                                        {t('dashboard.status_registered')}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                                <p className="text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.no_attendees')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}