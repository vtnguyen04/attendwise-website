// app/events/components/event-form/steps/registration-step.tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import ControlledSelect from '@/components/events/controlled-select';
import { EventFormValues } from '@/lib/schemas/event-form.schema';
import { Users, Shield, Scan, CreditCard } from 'lucide-react';

const SwitchField = ({ name, label, description }: { name: keyof EventFormValues; label: string; description: string }) => {
  const { control } = useFormContext<EventFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-xl p-5 liquid-glass-card">
          <div className="space-y-1 flex-1 pr-4">
            <FormLabel className="text-base font-semibold">{label}</FormLabel>
            <FormDescription className="text-sm">{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export const RegistrationStep = () => {
  const { control } = useFormContext<EventFormValues>();

  const waitlistEnabled = useWatch({ control, name: 'waitlist_enabled' });
  const isPaid = useWatch({ control, name: 'is_paid' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Registration & Security</h2>
        <p className="text-muted-foreground">Configure how users can register and check-in to your event.</p>
      </div>

      {/* Capacity Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Capacity & Waitlist</h3>
        </div>

        <FormField
          control={control}
          name="max_attendees"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Maximum Attendees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 100"
                  className="bg-background/50 border-glass-border focus:ring-2 focus:ring-primary/30"
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormDescription className="text-xs">Leave empty for unlimited attendees.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <SwitchField 
          name="waitlist_enabled" 
          label="Enable Waitlist" 
          description="Allow users to join a waitlist if the event is full." 
        />
        
        {waitlistEnabled && (
          <FormField
            control={control}
            name="max_waitlist"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Maximum Waitlist Size</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 50" 
                    className="bg-background/50 border-glass-border focus:ring-2 focus:ring-primary/30"
                    {...field} 
                    value={field.value ?? ''} 
                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} 
                  />
                </FormControl>
                <FormDescription className="text-xs">Leave empty for an unlimited waitlist.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Access Control Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Access Control</h3>
        </div>

        <SwitchField 
          name="require_approval" 
          label="Require Approval" 
          description="Manually approve each registration before they are confirmed." 
        />
        <SwitchField 
          name="whitelist_only" 
          label="Whitelist Only" 
          description="Only users you've added to a whitelist can register." 
        />
      </div>

      {/* Check-in Security Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <Scan className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Check-in Security</h3>
        </div>

        <SwitchField 
          name="face_verification_required" 
          label="Require Face Verification" 
          description="Use facial recognition during check-in for enhanced security." 
        />
        <SwitchField 
          name="liveness_check_required" 
          label="Require Liveness Check" 
          description="Prevent spoofing with a liveness check during check-in." 
        />
      </div>

      {/* Payment Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-glass flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Payment</h3>
        </div>

        <SwitchField 
          name="is_paid" 
          label="Paid Event" 
          description="Charge a fee for attendees to register for this event." 
        />
        
        {isPaid && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <FormField
              control={control}
              name="fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Fee</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 50.00" 
                      className="bg-background/50 border-glass-border focus:ring-2 focus:ring-primary/30"
                      {...field} 
                      value={field.value ?? ''} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Currency</FormLabel>
                  <ControlledSelect 
                    value={field.value || 'VND'} 
                    onValueChange={field.onChange} 
                    options={[
                      {value: 'VND', label: 'VND'}, 
                      {value: 'USD', label: 'USD'}
                    ]} 
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
};