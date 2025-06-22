import { useState, useEffect } from 'react';

interface RolePromptModalProps {
  isOpen: boolean;
  onSubmit: (data: { name: string; role: 'Interviewer' | 'Candidate' }) => void;
}

export default function RolePromptModal({ isOpen, onSubmit }: RolePromptModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Interviewer' | 'Candidate' | ''>('');

  // Pre-fill from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem('participantName');
      const savedRole = localStorage.getItem('participantRole') as 'Interviewer' | 'Candidate' | null;
      
      if (savedName) setName(savedName);
      if (savedRole) setRole(savedRole);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !role) return;

    // Save to localStorage for future use
    localStorage.setItem('participantName', name.trim());
    localStorage.setItem('participantRole', role);

    onSubmit({ name: name.trim(), role });
  };

  const isFormValid = name.trim().length > 0 && role !== '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Join the Meeting</h2>
          <p className="text-gray-600">Please enter your name and select your role to continue.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Your Role</label>
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer ${
                  role === 'Interviewer' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setRole('Interviewer')}
              >
                <input
                  type="radio"
                  name="role"
                  value="Interviewer"
                  checked={role === 'Interviewer'}
                  onChange={() => setRole('Interviewer')}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium">Interviewer</div>
                  <div className="text-sm text-gray-500">Conducting the interview</div>
                </div>
              </div>
              
              <div 
                className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer ${
                  role === 'Candidate' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setRole('Candidate')}
              >
                <input
                  type="radio"
                  name="role"
                  value="Candidate"
                  checked={role === 'Candidate'}
                  onChange={() => setRole('Candidate')}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium">Candidate</div>
                  <div className="text-sm text-gray-500">Being interviewed</div>
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className={`w-full py-2 px-4 rounded-md font-medium ${
              isFormValid 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!isFormValid}
          >
            Continue to Meeting
          </button>
        </form>
      </div>
    </div>
  );
}