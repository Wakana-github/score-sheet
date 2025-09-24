'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { allowedNameRegex, allowedGroupRegex, MAX_GROUP_NAME_LENGTH, MAX_NAME_LENGTH} from '../../lib/constants.ts'; 
import { useAuth, useUser } from '@clerk/nextjs'
import he from 'he';
import LoadingPage from '@/components/lodingPage';

interface Group {
  _id: string;
  groupName: string;
  members: string[];
  ownerId: string;
  createdAt?: string; // Add optional createdAt field
}

//End point URL for API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL|| 'http://localhost:8080/api'; 

// Segmenter for correct character counting in Japanese
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

const GroupRegisterPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('id');

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [numMembers, setNumMembers] = useState(2);
  const [members, setMembers] = useState<string[]>(Array(2).fill(''));
  const [isLoading, setIsLoading] = useState(false)


  // Data initialization process
  useEffect(() => {
    async function initData() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        router.push('/sign-in');
        return;
      }

      if (groupId) {
        await fetchGroupData(groupId);
      } else {
        setGroupName('');
        setNumMembers(2);
        // メンバー1をログインユーザーの名前に設定
        const userDisplayName = user?.publicMetadata?.nickname && typeof user.publicMetadata.nickname === 'string'
        ? user.publicMetadata.nickname
        : user?.username;
        const initialMembers = [userDisplayName, ...Array(1).fill('')];
        setMembers(initialMembers);

        setIsLoading(false);
      }
    }
    initData();
  }, [groupId, isLoaded, isSignedIn, router, user]);

  useEffect(() => {
    // Resize the member list based on the number of members
    setMembers(prevMembers => {
      const newMembers = [...prevMembers];
      while (newMembers.length < numMembers) {
        newMembers.push('');
      }
      return newMembers.slice(0, numMembers);
    });
  }, [numMembers]);


 // Fetch group data
  const fetchGroupData = async (id: string) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token found.');

      const res = await fetch(`${API_BASE_URL}/groups/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!res.ok) throw new Error('Failed to fetch group data');
      const data = await res.json();
      
      setGroupName(he.decode(data.groupName));
      setNumMembers(data.members.length);
      setMembers(data.members.map((member: string) => he.decode(member)));
    } catch (error) {
      console.error(error);
      alert('Failed to load group data.');
      router.push('/groups');
    } finally {
      setIsLoading(false);
    }
  };

  // Validation function for group name
      const validateGroupName = useCallback((value: string) => {
      const normalizedValue = value.trim().normalize('NFC');
      const length = [...segmenter.segment(normalizedValue)].length;
      
      if (length > MAX_GROUP_NAME_LENGTH) {
        alert(`Group name cannot exceed ${MAX_GROUP_NAME_LENGTH} characters.`);
        return false;
      }
      
      if (!allowedGroupRegex.test(normalizedValue)) {
        alert("Group name can only contain allowed characters.");
        return false;
      }
      
      return true;
    }, []);

    // Validation function for member name
    const validateMemberName = useCallback((value: string) => {
        const normalizedValue = value.trim().normalize('NFC');
        const length = [...segmenter.segment(normalizedValue)].length;
        
        if (length > MAX_NAME_LENGTH) {
            alert(`Member name cannot exceed ${MAX_NAME_LENGTH} characters.`);
            return false;
        }
        
        if (!allowedNameRegex.test(normalizedValue)) {
            alert("Member name can only contain letters, numbers, Japanese characters, and some emojis.");
            return false;
        }
        
        return true;
    }, []);

    // Handle group name change
    const handleGroupNameChange = useCallback((value: string) => {
      setGroupName(value);
    }, []);

    // Handle member name change
    const handleMemberNameChange = useCallback((index: number, value: string) => {
    const newMembers = [...members];
      newMembers[index] = value;
      setMembers(newMembers);
    }, [members]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
            // Perform validation for each field before submission
            if (!validateGroupName(groupName)) {
                setIsLoading(false);
                return;
            }
            for (const member of members) {
                if (!validateMemberName(member)) {
                    setIsLoading(false);
                    return;
                }
            }

            const token = await getToken();
            if (!token) throw new Error('No authentication token found.');

            const method = groupId ? 'PUT' : 'POST';
            const url = groupId ? `${API_BASE_URL}/groups/${groupId}` : `${API_BASE_URL}/groups`;
            const body = {
                groupName,
                members,
            };

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to ${groupId ? 'update' : 'create'} group: ${errorData.message}`);
      }
      
      alert(`Group ${groupId ? 'updated' : 'created'} successfully!`);
      router.push('/groups');
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

if (!isLoaded || !isSignedIn || isLoading) {
  return <LoadingPage />;
}

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{groupId ? 'Edit Group' : 'Create New Group'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="groupName" className="block text-gray-700">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => handleGroupNameChange(e.target.value)}
            onBlur={(e) => validateGroupName(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="numMembers" className="block text-gray-700">Number of Members</label>
          <select
            id="numMembers"
            value={numMembers}
            onChange={(e) => setNumMembers(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-md"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        {members.map((member, index) => (
          <div key={index}>
            <label htmlFor={`member-${index}`} className="block text-gray-700">Player {index + 1} Name</label>
            <input
              type="text"
              id={`member-${index}`}
              value={member}
              onChange={(e) => handleMemberNameChange(index, e.target.value)}
              onBlur={(e) => validateMemberName(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
              required
              disabled={index === 0}
            />
          </div>
        ))}

        <button
          type="submit"
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md "
        >
          {groupId ? 'Update Group' : 'Register Group'}
        </button>
      </form>
    </div>
  );
};

export default GroupRegisterPage;