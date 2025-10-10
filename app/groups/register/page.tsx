"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  allowedNameRegex,
  allowedGroupRegex,
  MAX_GROUP_NAME_LENGTH,
  MAX_NAME_LENGTH,
} from "../../lib/constants";
import { useAuth, useUser } from "@clerk/nextjs";
import he from "he";
import LoadingPage from "@/components/loadingPage";
import Link from "next/link";
import Select from "react-select";
import { v4 as uuidv4 } from "uuid"; 

// Interface for member
interface MemberData {
  memberId: string;
  name: string;
}

// interface for Group
interface Group {
  _id: string;
  groupName: string;
  members: MemberData[]; //use MemberData type
  userId: string;
  createdAt?: string; // Add optional createdAt field
}

//End point URL for API
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL||"http://localhost:8080/api";

// Segmenter for correct character counting in Japanese
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

const GroupRegisterPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("id");

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [numMembers, setNumMembers] = useState(2);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Data initialization process
  useEffect(() => {
    async function initData() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        router.push("/sign-in");
        return;
      }

      if (groupId) {
        await fetchGroupData(groupId);
      } else {
        setGroupName("");
        setNumMembers(2);
        // fetch username or nickname
        const userDisplayName: string = (
          (user?.publicMetadata?.nickname && typeof user.publicMetadata.nickname === "string"
            ? user.publicMetadata.nickname
            : user?.username) ?? "Player 1" // 💡 null/undefined の場合は "Player 1" を使用
         ) as string;
        //Set login uername as member1 name 
        const initialMembers: MemberData[] = [
          { memberId: uuidv4(), name: userDisplayName }, // login user
          { memberId: uuidv4(), name: "" }, 
        ];
        setMembers(initialMembers);
        setLoading(false);
        setIsLoading(false);
      }
    }
    initData();
  }, [groupId, isLoaded, isSignedIn, router, user]);

  // Number of players options for React select component
  const numPlayerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => ({
    value: num,
    label: num.toString(),
  }));

  // Wrapper for num of players
  const handleNumPlayerSelectChange = (
    selectedOption: { value: number; label: string } | null
  ) => {
    if (selectedOption) {
        setNumMembers(selectedOption.value);// set selected number
       }
  };

  // Resize the member list based on the number of members
  useEffect(() => {
    setMembers((prevMembers) => {
      const newMembers = [...prevMembers];
      while (newMembers.length < numMembers) {
        newMembers.push({ memberId: uuidv4(), name: "" });
      }
      return newMembers.slice(0, numMembers);
    });
  }, [numMembers]);

  // Fetch group data
  const fetchGroupData = async (id: string) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token found.");

      const res = await fetch(`${API_BASE_URL}/groups/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch group data");
       const data: Group = await res.json();

      setGroupName(he.decode(data.groupName));
      setNumMembers(data.members.length);
      setMembers(data.members.map((member) => ({
        memberId: member.memberId,
        name: he.decode(member.name),
        }))
      );
    } catch (error) {
      console.error(error);
      alert("Failed to load group data.");
      router.push("/groups");
    } finally {
      setIsLoading(false);
    }
  };

  // Validation function for group name
  const validateGroupName = useCallback((value: string) => {
    const normalizedValue = value.trim().normalize("NFC");
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
    const normalizedValue = value.trim().normalize("NFC");
    const length = [...segmenter.segment(normalizedValue)].length;

    if (length > MAX_NAME_LENGTH) {
      alert(`Member name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return false;
    }

    if (!allowedNameRegex.test(normalizedValue)) {
      alert(
        "Member name can only contain letters, numbers, Japanese characters, and some emojis."
      );
      return false;
    }
    return true;
  }, []);

  // Handle group name change
  const handleGroupNameChange = useCallback((value: string) => {
    setGroupName(value);
  }, []);

  // Handle member name change
  const handleMemberNameChange = useCallback(
    (index: number, value: string) => {
      setMembers((prevMembers) => {
      const newMembers = [...prevMembers];
      newMembers[index] = { ...newMembers[index], name: value }; 
      return newMembers;
      });
    },[]
  );

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
        if (!validateMemberName(member.name)) {
          setIsLoading(false);
          return;
        }
      }
      const token = await getToken();
      if (!token) throw new Error("No authentication token found.");
      const method = groupId ? "PUT" : "POST";
      const url = groupId
        ? `${API_BASE_URL}/groups/${groupId}`
        : `${API_BASE_URL}/groups`;
      const body = {
        groupName,
        members,
      };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          `Failed to ${groupId ? "update" : "create"} group: ${
            errorData.message
          }`
        );
      }
      alert(`Group ${groupId ? "updated" : "created"} successfully!`);
      router.push("/groups");
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
    <div className="container mx-auto px-10 my-6 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 hand_font">
        {groupId ? "Edit Group" : "Create New Group"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3 text-base lg:text-xl  ">
        <div>
          <label htmlFor="groupName" className="block font-semibold">
            Group Name
          </label>
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
          <label htmlFor="numMembers" className="block font-semibold mt-1">
           Number of Members
          </label>
          <Select
            id="numMembers"
            options={numPlayerOptions} 
            onChange={handleNumPlayerSelectChange}
            value={numPlayerOptions.find(
                    (opt) => opt.value === numMembers
                )}
            
            isSearchable={false}
            classNamePrefix="react-select"
            className="w-full border rounded-md" //styles inside the component
            styles={{
              //classNames: control: wrapper for the select box
               control: (baseStyles, state) => ({
                ...baseStyles,                      
                backgroundColor: 'transparent',
              }),
            }}
            components={{ DropdownIndicator: () => null }}
          />
        </div>

        {members.map((member, index) => (
          <div key={member.memberId || index}>
            <label
              htmlFor={`member-${index}`}
              className="block font-semibold"
            >
              Player {index + 1} Name
            </label>
            <input
              type="text"
              id={`member-${index}`}
              value={member.name}
              onChange={(e) => handleMemberNameChange(index, e.target.value)}
              onBlur={(e) => validateMemberName(e.target.value)}
              className="w-full mt-2 p-2 border rounded-md"
              required
              disabled={index === 0}
            />
          </div>
        ))}

        <button
          type="submit"
          className="px-4 py-2 lg:mt-6 bg-gray-600 hover:bg-gray-700 text-white rounded-md "
        >
          {groupId ? "Update Group" : "Register Group"}
        </button>
      </form>
      {/* Return to Group page button */}
      <div className="self-start">
        <Link href="/groups" passHref>
          <button className="py-2 px-2 lg:py-4 text-xl lg:text-2xl hand_font mt-2">
            ← Return to Group
          </button>
        </Link>
      </div>
    </div>
  );
};

export default GroupRegisterPage;
