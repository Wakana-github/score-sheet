// src/app/groups/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import  Group  from '../server/models/group'; 
import { useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'; 
import he from 'he'; 

interface Group {
  _id: string;
  groupName: string;
  members: string[];
  ownerId: string;
  createdAt?: string; // Add optional createdAt field
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL|| 'http://localhost:8080/api/groups'; 

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

        const data = await res.json();
        const decodedGroups = data.map((group: Group) => ({
          ...group,
          groupName: he.decode(group.groupName),
          members: group.members.map(member => he.decode(member)),
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold my-6 hand_font">Your Groups</h1>
      <button
        onClick={() => router.push('/groups/register')}
        className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 hand_font rounded-md text-white text-2xl"
      >
        Create New Group
      </button>

      {groups.length === 0 ? (
        <p>You have no groups yet. Create one!</p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group._id} className="bg-[#424911] text-white p-4 rounded-md shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">{group.groupName}</h2>
                <p className="text-white">Members: {group.members.length}</p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(group._id)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group._id)}
                  className="px-3 py-1 bg-red-700 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GroupListPage;