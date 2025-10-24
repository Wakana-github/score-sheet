// app/groups/page.tsx
'use client';

/* Group list page: front page to renders the user's groups list.
It fetches data securely from the /api/groups endpoint using the user's Clerk authentication token 
and provides UI functions for navigating to the Edit page or initiating group deletion.
*/

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'; 
import he from 'he'; 
import { MAX_GROUPS } from "../lib/constants.ts";
import ReturnHomeBtn from '@/components/returnToHomeBtn.tsx';
import { fadeInVariants, itemsVariants } from '../lib/variants'
import { motion } from "motion/react"
import LoadingPage from '@/components/loadingPage.tsx';

// Define the structure of a member object
interface MemberData {
  memberId: string;
  name: string;
}

// Defines the structure of a Group object fetched from the API
interface Group {
  _id: string;
  groupName: string;
  members: MemberData[]
  userId: string;
  createdAt?: string; // Add optional createdAt field
}

const API_BASE_URL = '/api/groups'; 

const GroupListPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { isLoaded, isSignedIn, getToken } = useAuth(); 

// useEffect hook to fetch user groups from the backend API.
// Runs once when the component mounts and whenever auth state changes.
 useEffect(() => {
    async function fetchGroups() {
      //check if Clerk is loaded and user is signed in
      if (!isLoaded) {
            return; 
        }
      if (!isSignedIn) {
            setLoading(false); 
            return;
        }


      setLoading(true);
      try {

        // get the JWT for API authorization
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found.');
        }

        // Fetch groups owned by the current user
        const res = await fetch(API_BASE_URL, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to fetch groups`);
        }

        const resJson = await res.json();
        const data: Group[] = resJson.data;
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
        console.error("Error fetching groups. Please try again.");
        setGroups([]);      // Clear the group list on error
      } finally {
        setLoading(false);  // End loading regardless of success/failure
      }
    }
    fetchGroups();
  }, [isLoaded, isSignedIn, getToken]);


  // Handle the deletion of a specific group.
  const handleDelete = async (groupId: string) => {
    //check if user is signed in
    if (!isSignedIn) {
      alert("You must be signed in to delete a group.");
      return;
    }
    //Confirmation dialog
    if (confirm('Are you sure you want to delete this group?')) {
      try {

        // get the JWT for API authorization
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found.');
        }

        // Send DELETE request to the backend API
        const res = await fetch(`${API_BASE_URL}/${groupId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to delete group.`);
        }
        
        // Successfully deleted, re-fetch group list
        alert('Group deleted successfully!');
        setGroups(groups.filter(group => group._id !== groupId));
      } catch (error) {
        console.error("Error deleting group");
        alert(`Failed to delete group`);
      }
    }
  };

  // Handles navigation to the group registration/edit page.
  const handleEdit = (groupId: string) => {
    router.push(`/groups/register?id=${groupId}`);  // Navigate to the register page for specifyed group ID
  };

  // Display loading page while data is being fetched
  if (!isLoaded || loading) {
    return <LoadingPage/>
  }

  // Prompt user to sign in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl mb-4">You must be signed in to view your groups.</p>
        {/* SignInButton or other sign-in UI */}
      </div>
    );
  }

  // Determine if the user can create more groups based on the constant limit
  const canCreateGroup = groups.length < MAX_GROUPS;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="mb-4 text-4xl md:text-5xl font-bold hand_font">Your Groups
        <span className="text-2xl lg:text-3xl"> ({groups.length}/{MAX_GROUPS})</span>
      </h1>

      {/* Button to navigate to the group creation page */}
      <button
        onClick={() => router.push('/groups/register')}
        className={`mb-4 px-4 py-2 hand_font rounded-md text-white text-xl lg:text-2xl ${
          canCreateGroup ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
        disabled={!canCreateGroup}
      >
        Create New Group
      </button>
      
      {/* Warning message if the max group limit is reached */}
      {!canCreateGroup && (
        <p className="text-black mb-4">{`You have reached the maximum number of groups (${MAX_GROUPS}).`}</p>
      )}

      {/* Conditional rendering based on whether groups exist */}
      {groups.length === 0 ? (
        <p>You have no groups yet. Create one!</p>
      ) : (
        <motion.div variants={fadeInVariants}
                      initial="hidden" 
                      animate="show"
        >
          <ul className="space-y-3 ">
            {/* Map over the groups array to render each group item */}
            {groups.map((group) => (
              <motion.li variants={itemsVariants} 
                         key={group._id} 
                         className="dark_green text-base text-black px-3 py-1 rounded-md shadow-sm flex justify-between items-center"
              >
                <div className="min-w-0 mx-1">
                  <h2 className="text-lg lg:text-xl font-semibold ">{group.groupName}</h2>
                  <p className="text-black">Members: {group.members.length}</p>
                </div>

                {/* Edit and Delete buttons container */}
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
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

       {/* Return to Home page button */}
      <div className="self-start py-4 px-2 mt-2">
        <ReturnHomeBtn/>
      </div>

    </div>
  );
};

export default GroupListPage;