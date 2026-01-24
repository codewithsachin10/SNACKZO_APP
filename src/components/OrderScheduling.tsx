import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Repeat, ChevronDown, X, Check, AlertCircle } from "lucide-react";
import { format, addDays, isBefore, startOfDay, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";

interface OrderSchedulingProps {
  isScheduled: boolean;
  setIsScheduled: (value: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (value: string) => void;
  scheduledTime: string;
  setScheduledTime: (value: string) => void;
  isRecurring?: boolean;
  setIsRecurring?: (value: boolean) => void;
  recurringFrequency?: string;
  setRecurringFrequency?: (value: string) => void;
  storeHours?: { open: string; close: string };
}

export function OrderScheduling({
  isScheduled,
  setIsScheduled,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  isRecurring = false,
  setIsRecurring,
  recurringFrequency = "weekly",
  setRecurringFrequency,
  storeHours = { open: "08:00", close: "22:00" }
}: OrderSchedulingProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Generate available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date: format(date, "yyyy-MM-dd"),
      dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(date, "EEE"),
      dayNumber: format(date, "d"),
      month: format(date, "MMM"),
      isToday: i === 0
    };
  });

  // Generate time slots (30 min intervals)
  const generateTimeSlots = () => {
    const slots: { time: string; label: string; available: boolean }[] = [];
    const [openHour] = storeHours.open.split(":").map(Number);
    const [closeHour] = storeHours.close.split(":").map(Number);
    
    for (let hour = openHour; hour <= closeHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === closeHour && minute > 0) break;
        
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const now = new Date();
        const slotTime = setMinutes(setHours(new Date(), hour), minute);
        
        // If today, check if slot is in the future (with 30 min buffer)
        const isAvailable = scheduledDate !== format(new Date(), "yyyy-MM-dd") || 
          slotTime.getTime() > now.getTime() + 30 * 60 * 1000;
        
        slots.push({
          time: timeStr,
          label: format(slotTime, "h:mm a"),
          available: isAvailable
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const frequencyOptions = [
    { value: "daily", label: "Every Day", icon: "📅" },
    { value: "weekly", label: "Every Week", icon: "🔄" },
    { value: "biweekly", label: "Every 2 Weeks", icon: "📆" },
    { value: "monthly", label: "Every Month", icon: "🗓️" }
  ];

  const getSelectedDateLabel = () => {
    if (!scheduledDate) return "Select date";
    const selected = availableDates.find(d => d.date === scheduledDate);
    if (selected) {
      return selected.isToday ? "Today" : `${selected.dayName}, ${selected.month} ${selected.dayNumber}`;
    }
    return format(new Date(scheduledDate), "EEE, MMM d");
  };

  const getSelectedTimeLabel = () => {
    if (!scheduledTime) return "Select time";
    const slot = timeSlots.find(s => s.time === scheduledTime);
    return slot?.label || scheduledTime;
  };

  return (
    <div className="space-y-4">
      {/* Toggle scheduling */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Clock size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Schedule Delivery</h3>
            <p className="text-sm text-muted-foreground">Choose when to receive your order</p>
          </div>
        </div>
        <button
          onClick={() => setIsScheduled(!isScheduled)}
          className={cn(
            "relative w-12 h-6 rounded-full transition-colors",
            isScheduled ? "bg-primary" : "bg-muted"
          )}
        >
          <motion.div
            animate={{ x: isScheduled ? 24 : 2 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
          />
        </button>
      </div>

      {/* Scheduling options */}
      <AnimatePresence>
        {isScheduled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* Date selection */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Calendar size={14} /> Select Date
              </label>
              
              {/* Quick date buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {availableDates.map((dateOption) => (
                  <button
                    key={dateOption.date}
                    onClick={() => setScheduledDate(dateOption.date)}
                    className={cn(
                      "flex flex-col items-center min-w-[60px] p-3 rounded-xl transition-all border-2",
                      scheduledDate === dateOption.date
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted hover:bg-muted/80"
                    )}
                  >
                    <span className="text-xs text-muted-foreground">{dateOption.dayName}</span>
                    <span className="text-lg font-bold">{dateOption.dayNumber}</span>
                    <span className="text-xs text-muted-foreground">{dateOption.month}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time selection */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Clock size={14} /> Select Time
              </label>
              
              <button
                onClick={() => setShowTimePicker(!showTimePicker)}
                className="w-full flex items-center justify-between p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
              >
                <span className={scheduledTime ? "font-medium" : "text-muted-foreground"}>
                  {getSelectedTimeLabel()}
                </span>
                <ChevronDown size={18} className={cn("transition-transform", showTimePicker && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {showTimePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto p-1">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => {
                            if (slot.available) {
                              setScheduledTime(slot.time);
                              setShowTimePicker(false);
                            }
                          }}
                          disabled={!slot.available}
                          className={cn(
                            "p-2 rounded-lg text-sm transition-colors",
                            scheduledTime === slot.time
                              ? "bg-primary text-primary-foreground"
                              : slot.available
                              ? "bg-muted hover:bg-muted/80"
                              : "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                          )}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recurring option */}
            {setIsRecurring && (
              <div className="p-4 bg-muted rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat size={18} className="text-primary" />
                    <span className="font-medium">Make this recurring</span>
                  </div>
                  <button
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors",
                      isRecurring ? "bg-primary" : "bg-background"
                    )}
                  >
                    <motion.div
                      animate={{ x: isRecurring ? 24 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {isRecurring && setRecurringFrequency && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {frequencyOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setRecurringFrequency(option.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg transition-colors",
                          recurringFrequency === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-background/80"
                        )}
                      >
                        <span>{option.icon}</span>
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Summary */}
            {scheduledDate && scheduledTime && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
              >
                <Check className="text-green-500" size={20} />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Scheduled for {getSelectedDateLabel()} at {getSelectedTimeLabel()}
                  </p>
                  {isRecurring && (
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Repeating {frequencyOptions.find(f => f.value === recurringFrequency)?.label.toLowerCase()}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Warning for same day */}
            {scheduledDate === format(new Date(), "yyyy-MM-dd") && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  For same-day delivery, please allow at least 30 minutes preparation time.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MINI SCHEDULING WIDGET (For Cart/Checkout)
// ============================================

interface MiniSchedulingWidgetProps {
  onSchedule: (date: string, time: string) => void;
  currentSchedule?: { date: string; time: string } | null;
}

export function MiniSchedulingWidget({ onSchedule, currentSchedule }: MiniSchedulingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(currentSchedule?.date || "");
  const [time, setTime] = useState(currentSchedule?.time || "");

  const quickTimes = [
    { label: "ASAP", value: "" },
    { label: "In 1 hour", value: format(addDays(new Date(), 0), "HH:00").replace(/(\d+)/, (m) => String(Number(m) + 1).padStart(2, "0")) },
    { label: "This evening", value: "18:00" },
    { label: "Tomorrow", value: "tomorrow" }
  ];

  const handleQuickTime = (quickValue: string) => {
    if (quickValue === "") {
      onSchedule("", "");
    } else if (quickValue === "tomorrow") {
      setDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setTime("12:00");
      onSchedule(format(addDays(new Date(), 1), "yyyy-MM-dd"), "12:00");
    } else {
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime(quickValue);
      onSchedule(format(new Date(), "yyyy-MM-dd"), quickValue);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
      >
        <Clock size={16} />
        {currentSchedule?.date && currentSchedule?.time
          ? `Scheduled: ${format(new Date(currentSchedule.date), "MMM d")} at ${currentSchedule.time}`
          : "Deliver ASAP"
        }
        <ChevronDown size={14} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 bg-card border border-border rounded-xl shadow-lg z-20"
          >
            {quickTimes.map((qt) => (
              <button
                key={qt.label}
                onClick={() => handleQuickTime(qt.value)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                {qt.label}
              </button>
            ))}
            <button
              onClick={() => {
                // Would open full scheduling modal
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-primary"
            >
              Choose specific time...
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
