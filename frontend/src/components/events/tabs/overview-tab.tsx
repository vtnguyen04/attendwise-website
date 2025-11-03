'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppEvent, EventSession } from "@/lib/types";
import { Calendar, Clock, CheckCircle2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn, extractStringValue, formatInTimezone } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

function SessionItem({ session, index, fallbackTimezone }: { session: EventSession; index: number; fallbackTimezone: string }) {
    const now = new Date();
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);
    const isUpcoming = now < startTime;
    const isLive = now >= startTime && now <= endTime;
    const isCompleted = now > endTime;
    const timezone = session.timezone || fallbackTimezone || 'UTC';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={cn(
                "liquid-glass-card p-5 transition-all duration-300 relative overflow-hidden",
                isCompleted && "opacity-60",
                isLive && "ring-2 ring-red-500/50 shadow-magnify"
            )}
        >
            {/* Live indicator background glow */}
            {isLive && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent pointer-events-none" />
            )}

            <div className="flex items-start gap-4 relative z-10">
                {/* Status Icon */}
                <div className="mt-1">
                    {isLive && (
                        <div className="relative">
                            <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 h-3 w-3 bg-red-600 rounded-full animate-ping"></div>
                        </div>
                    )}
                    {isUpcoming && (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                    )}
                    {isCompleted && (
                        <div className="w-10 h-10 rounded-lg bg-muted/50 backdrop-glass flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-base mb-2">
                        {formatInTimezone(startTime, timezone, 'EEEE, MMM dd, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="font-semibold">
                            {formatInTimezone(startTime, timezone, 'p')} - {formatInTimezone(endTime, timezone, 'p')}
                        </span>
                    </div>
                </div>

                {/* Live Badge */}
                {isLive && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="shrink-0"
                    >
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 px-3 py-1.5 rounded-full shadow-lg">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            LIVE NOW
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

export default function OverviewTab({ event }: { event: AppEvent }) {
    const [showAll, setShowAll] = useState(false);

    const sortedSessions = useMemo(() => {
        if (!event.sessions) return [];
        const now = new Date();
        return [...event.sessions].sort((a, b) => {
            const aStart = new Date(a.start_time);
            const bStart = new Date(b.start_time);
            const aIsPast = aStart < now;
            const bIsPast = bStart < now;

            if (aIsPast && !bIsPast) return 1;
            if (!aIsPast && bIsPast) return -1;
            
            if (aIsPast) {
                return bStart.getTime() - aStart.getTime();
            }
            return aStart.getTime() - bStart.getTime();
        });
    }, [event.sessions]);

    const visibleSessions = showAll ? sortedSessions : sortedSessions.slice(0, 5);

    return (
        <div className="space-y-6">
            {/* About Event Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <Card className="dashboard-panel border-0 shadow-none">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-bold">About this Event</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm">
                            {extractStringValue(event.description) || "No description provided."}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Sessions Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <Card className="dashboard-panel border-0 shadow-none">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-xl font-bold">Sessions</CardTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {sortedSessions.length} {sortedSessions.length === 1 ? 'session' : 'sessions'} scheduled
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {sortedSessions.length > 0 ? (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {visibleSessions.map((session, idx) => (
                                        <SessionItem
                                            key={session.id}
                                            session={session}
                                            index={idx}
                                            fallbackTimezone={event.timezone}
                                        />
                                    ))}
                                </AnimatePresence>
                                
                                {sortedSessions.length > 5 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="pt-2"
                                    >
                                        <button 
                                            className="liquid-glass-button w-full"
                                            onClick={() => setShowAll(!showAll)}
                                        >
                                            <span>
                                                {showAll 
                                                    ? 'Show Less' 
                                                    : `Show ${sortedSessions.length - 5} More ${sortedSessions.length - 5 === 1 ? 'Session' : 'Sessions'}`
                                                }
                                            </span>
                                            {showAll 
                                                ? <ChevronUp className="h-4 w-4" /> 
                                                : <ChevronDown className="h-4 w-4" />
                                            }
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-card p-12 text-center"
                            >
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 backdrop-glass flex items-center justify-center">
                                    <Calendar className="h-10 w-10 text-primary/60" />
                                </div>
                                <p className="text-muted-foreground font-medium">
                                    No sessions scheduled for this event.
                                </p>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
