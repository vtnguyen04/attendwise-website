// app/events/components/event-form/steps/registration-step.tsx
'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import ControlledSelect from '@/components/events/controlled-select';
import { EventFormValues } from '@/lib/schemas/event-form.schema';

const SwitchField = ({ name, label, description }: { name: keyof EventFormValues; label: string; description: string }) => {
  const { control } = useFormContext<EventFormValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg p-4 glass-card">
          <div className="space-y-0.5">
            <FormLabel className="text-base text-foreground">{label}</FormLabel>
            <FormDescription className="text-muted-foreground">{description}</FormDescription>
          </div>
          <FormControl>
            {/* The `as any` is a concession to TypeScript's difficulty with generic component props from a mapped key */}
            <Switch checked={field.value as any} onCheckedChange={field.onChange} />
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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Step 3: Registration & Security</CardTitle>
        <CardDescription>Configure how users can register and check-in to your event.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="max_attendees"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Maximum Attendees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 100"
                  {...field}
                  value={field.value ?? ''} // Handle undefined for controlled component
                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormDescription className="text-muted-foreground">Leave empty for unlimited attendees.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <SwitchField name="waitlist_enabled" label="Enable Waitlist" description="Allow users to join a waitlist if the event is full." />
        
        {waitlistEnabled && (
           <FormField
            control={control}
            name="max_waitlist"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-foreground">Maximum Waitlist Size</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 50" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                <FormDescription className="text-muted-foreground">Leave empty for an unlimited waitlist.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        
        <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-lg">Access Control</h4>
            <SwitchField name="require_approval" label="Require Approval" description="Manually approve each registration before they are confirmed." />
            <SwitchField name="whitelist_only" label="Whitelist Only" description="Only users you've added to a whitelist can register." />
        </div>

        <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-lg">Check-in Security</h4>
            <SwitchField name="face_verification_required" label="Require Face Verification" description="Use facial recognition during check-in for enhanced security." />
            <SwitchField name="liveness_check_required" label="Require Liveness Check" description="Prevent spoofing with a liveness check during check-in." />
        </div>
        
        <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-lg">Payment</h4>
            <SwitchField name="is_paid" label="Paid Event" description="Charge a fee for attendees to register for this event." />
            {isPaid && (
                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={control}
                        name="fee"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-foreground">Fee</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 50.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-foreground">Currency</FormLabel>
                            <ControlledSelect value={field.value || 'VND'} onValueChange={field.onChange} options={[{value: 'VND', label: 'VND'}, {value: 'USD', label: 'USD'}]} />
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </div>

      </CardContent>
    </Card>
  );
};