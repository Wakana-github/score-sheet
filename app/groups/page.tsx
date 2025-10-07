// src/app/groups/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'; 
import he from 'he'; 
import Link from 'next/link';
import { MAX_GROUPS } from "../lib/constants.ts";
import ReturnHomeBtn from '@/components/returnToHomeBtn.tsx';

interface MemberData {
  memberId: string;
  name: string;
}

interface Group {
  _id: string;
  groupName: string;
  members: MemberData[]
  userId: string;
  createdAt?: string; // Add optional createdAt field
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL||'http://localhost:8080/api/groups';

const GroupListPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { isLoaded, isSignedIn, getToken } = useAuth(); 

 useEffect(() => {
    async function fetchGroups() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found.');
        }

        const res = await fetch(`${API_BASE_URL}/groups`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to fetch groups: ${errorData.message}`);
        }

        const data: Group[] = await res.json();
        const decodedGroups = data.map((group: Group) => ({
          ...group,
          groupName: he.decode(group.groupName),
          members: group.members.map(member => ({
             memberId: member.memberId, 
             name: he.decode(member.name) 
          })),
        }));
        setGroups(decodedGroups);
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroups([]); // Clear the group list on error
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, [isLoaded, isSignedIn, getToken]);

   const handleDelete = async (groupId: string) => {
    if (!isSignedIn) {
      alert("You must be signed in to delete a group.");
      return;
    }
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found.');
        }

        const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to delete group: ${errorData.message}`);
        }
        
        // Successfully deleted, re-fetch group list
        alert('Group deleted successfully!');
        setGroups(groups.filter(group => group._id !== groupId));
      } catch (error) {
        console.error("Error deleting group:", error);
        alert(`Failed to delete group: ${error}`);
      }
    }
  };

  const handleEdit = (groupId: string) => {
    router.push(`/groups/register?id=${groupId}`);
  };

  if (!isLoaded || loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl mb-4">You must be signed in to view your groups.</p>
        {/* SignInButton or other sign-in UI */}
      </div>
    );
  }

  const canCreateGroup = groups.length < MAX_GROUPS;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="mb-4 text-4xl md:text-5xl font-bold hand_font">Your Groups
        <span className="text-2xl lg:text-3xl"> ({groups.length}/{MAX_GROUPS})</span>
      </h1>
      <button
        onClick={() => router.push('/groups/register')}
        className={`mb-4 px-4 py-2 hand_font rounded-md text-white text-xl lg:text-2xl ${
          canCreateGroup ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
        disabled={!canCreateGroup}
      >
        Create New Group
      </button>

      {!canCreateGroup && (
        <p className="text-black mb-4">{`You have reached the maximum number of groups (${MAX_GROUPS}).`}</p>
      )}

      {groups.length === 0 ? (
        <p>You have no groups yet. Create one!</p>
      ) : (
        <ul className="space-y-3 ">
          {groups.map((group) => (
            <li key={group._id} className="dark_green text-base text-black px-3 py-1 rounded-md shadow-sm flex justify-between items-center">
              <div className="min-w-0 mx-1">
                <h2 className="text-lg lg:text-xl font-semibold ">{group.groupName}</h2>
                <p className="text-black">Members: {group.members.length}</p>
              </div>
              <div className="space-x-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(group._id)}
                  className="px-3 py-1 m-1 text-base lg:text-lg bg-yellow-600 text-white rounded-md hover:bg-yellow-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group._id)}
                  className="px-3 py-1 text-base lg:text-lg bg-red-700 text-white rounded-md hover:bg-red-900"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

       {/* Return to Home page button */}
    <div className="self-start py-4 px-2 mt-2">
        <ReturnHomeBtn/>
      </div>

    </div>
     
    
  );
};

export default GroupListPage;