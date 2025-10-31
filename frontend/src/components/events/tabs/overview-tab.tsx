'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppEvent, EventSession } from "@/lib/types";
import { format } from 'date-fns';
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { cn, extractStringValue } from "@/lib/utils";

function SessionItem({ session }: { session: EventSession }) {
    const now = new Date();
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);
    const isUpcoming = now < startTime;
    const isLive = now >= startTime && now <= endTime;
    const isCompleted = now > endTime;

    return (
        <div className={cn(
            "flex items-start justify-between p-4 rounded-xl border-2 transition-all duration-300",
            isCompleted 
                ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700" 
                : isLive 
                ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 shadow-lg shadow-red-500/20"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        )}>
            <div className="flex items-start gap-4 flex-1">
                <div className="mt-1">
                    {isLive && <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>}
                    {isUpcoming && <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                    {isCompleted && <CheckCircle2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
                </div>
                <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">
                        {format(new Date(session.start_time), 'EEEE, MMM dd, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">
                            {format(new Date(session.start_time), 'p')} - {format(new Date(session.end_time), 'p')}
                        </span>
                    </div>
                    {isLive && (
                        <div className="mt-2 inline-block">
                            <span className="text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 px-3 py-1 rounded-full animate-pulse">
                                LIVE NOW
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function OverviewTab({ event }: { event: AppEvent }) {
    const [showAll, setShowAll] = useState(false);

    const sortedSessions = useMemo(() => {
        if (!event.sessions) return [];
        const now = new Date();
        // Sort sessions: upcoming first, then live, then completed sorted by date
        return [...event.sessions].sort((a, b) => {
            const aStart = new Date(a.start_time);
            const bStart = new Date(b.start_time);
            const aIsPast = aStart < now;
            const bIsPast = bStart < now;

            if (aIsPast && !bIsPast) return 1;
            if (!aIsPast && bIsPast) return -1;
            
            // Both are upcoming or both are past, sort by time
            if (aIsPast) {
                return bStart.getTime() - aStart.getTime(); // Most recent past first
            }
            return aStart.getTime() - bStart.getTime(); // Closest upcoming first
        });
    }, [event.sessions]);

    const visibleSessions = showAll ? sortedSessions : sortedSessions.slice(0, 5);

    return (
        <div className="space-y-6">
            {/* About Event Card */}
            <Card className="glass-card border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="h-1 w-1 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">About this Event</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                        {extractStringValue(event.description) || "No description provided."}
                    </p>
                </CardContent>
            </Card>

            {/* Sessions Card */}
            <Card className="glass-card border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="h-1 w-1 bg-gradient-to-r from-green-600 to-green-700 rounded-full"></div>
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {sortedSessions.length > 0 ? (
                        <div className="space-y-3">
                            {visibleSessions.map((session, idx) => (
                                <div key={session.id}>
                                    <SessionItem session={session} />
                                    {idx < visibleSessions.length - 1 && (
                                        <Separator className="my-3 bg-gray-200 dark:bg-gray-700" />
                                    )}
                                </div>
                            ))}
                            {sortedSessions.length > 5 && (
                                <div className="mt-4">
                                    <Button 
                                        variant="outline" 
                                        className="w-full" 
                                        onClick={() => setShowAll(!showAll)}
                                    >
                                        {showAll ? 'Show Less' : `Show ${sortedSessions.length - 5} More Sessions`}
                                        {showAll ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                No sessions scheduled for this event.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}