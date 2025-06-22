import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface RolePromptModalProps {
  isOpen: boolean;
  onSubmit: (data: { name: string; role: 'Interviewer' | 'Candidate' }) => void;
}

export default function RolePromptModal({ isOpen, onSubmit }: RolePromptModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Interviewer' | 'Candidate' | ''>('');

  // Pre-fill from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('participantName');
    const savedRole = localStorage.getItem('participantRole') as 'Interviewer' | 'Candidate' | null;
    
    if (savedName) setName(savedName);
    if (savedRole) setRole(savedRole);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !role) return;

    // Save to localStorage for future use
    localStorage.setItem('participantName', name.trim());
    localStorage.setItem('participantRole', role);

    onSubmit({ name: name.trim(), role });
  };

  const isFormValid = name.trim().length > 0 && role !== '';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Join the Meeting</DialogTitle>
          <DialogDescription>
            Please enter your name and select your role to continue.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label>Your Role</Label>
            <RadioGroup 
              value={role} 
              onValueChange={(value) => setRole(value as 'Interviewer' | 'Candidate')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                <RadioGroupItem value="Interviewer" id="interviewer" />
                <Label htmlFor="interviewer" className="cursor-pointer flex-1">
                  <div className="font-medium">Interviewer</div>
                  <div className="text-sm text-gray-500">Conducting the interview</div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                <RadioGroupItem value="Candidate" id="candidate" />
                <Label htmlFor="candidate" className="cursor-pointer flex-1">
                  <div className="font-medium">Candidate</div>
                  <div className="text-sm text-gray-500">Being interviewed</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!isFormValid}
          >
            Continue to Meeting
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}