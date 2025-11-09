"use client";

/* Grroup form page to allow logged-in user to registaer a new group(POST) or edit an existing group(PUT)*/
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  allowedNameRegex,
  allowedGroupRegex,
  MAX_GROUP_NAME_LENGTH,
  MAX_NAME_LENGTH,
} from "@/app/lib/constants";
import { useAuth, useUser } from "@clerk/nextjs";
import he from "he";
import LoadingPage from "@/components/loadingPage";
import Link from "next/link";
import Select from "react-select";
import { v4 as uuidv4 } from "uuid"; 

// Interface for member data structure
interface MemberData {
  memberId: string;
  name: string;
}

// interface for Group data structure
interface Group {
  _id: string;
  groupName: string;
  members: MemberData[]; //use MemberData type
  userId: string;
  createdAt?: string;
}

//End point URL for API
const API_BASE_URL = "/api";

// Segmenter for correct character counting in Japanese (handles multibyte characters accurately)
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

  const GroupRegisterPage: React.FC = () => {
  // Router and URL search params hook
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("id");
  // Authentication and user state from Clerk
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  // Component state management
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [numMembers, setNumMembers] = useState(2);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");


  //------------------------------------
  // Get CSRF token
  //------------------------------------
  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const res = await fetch("/api/csrf-token", {
        credentials: "include",  
      });
        if (!res.ok) throw new Error("Failed to fetch CSRF token");
        const data = await res.json();
        setCsrfToken(data.token); // save token as the state
      } catch (err) {
        console.error("Error fetching CSRF token:", err);
      }
    }
    fetchCsrfToken();
  }, []); // only read once when page is loaded

  //------------------------------------
  // Data initialization process
  // Fetches existing group data if in edit mode or sets initial data if creating a new group.
  //--------------------------------------
  useEffect(() => {
    async function initData() {
      if (!isLoaded) return; // Wait for Clerk to load

      // If user is not signed in, redirect to the sign-in page.
      if (!isSignedIn) {
        router.push("/sign-in");
        return;
      }

      if (groupId) {
        await fetchGroupData(groupId);
      } else {
        setGroupName("");
        setNumMembers(2);

        // fetch loogged-in user's username or nickname
        const userDisplayName: string = (
          (user?.publicMetadata?.nickname && typeof user.publicMetadata.nickname === "string"
            ? user.publicMetadata.nickname
            : user?.username) ?? "Player 1" // use 'Player1' when null/undefined 
         ) as string;

        //Set members list with the logged-in user as member 1 name 
        const initialMembers: MemberData[] = [
          { memberId: uuidv4(), name: userDisplayName }, // logged-in user
          { memberId: uuidv4(), name: "" }, 
        ];
        setMembers(initialMembers);
        setLoading(false);
        setIsLoading(false);
      }
    }
    initData();
  }, [groupId, isLoaded, isSignedIn, router, user]);

  //-----------------------------------------------------
  // Number of players options for React select component
  //----------------------------------------------------
  const numPlayerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => ({
    value: num,
    label: num.toString(),
  }));

  // Handler for when a new number of members is selected
  const handleNumPlayerSelectChange = (
    selectedOption: { value: number; label: string } | null
  ) => {
    if (selectedOption) {
        setNumMembers(selectedOption.value);// set selected number
       }
  };

  // Resize the members array size based on the number of members changes
  useEffect(() => {
    setMembers((prevMembers) => {
      const newMembers = [...prevMembers];
      while (newMembers.length < numMembers) {
        newMembers.push({ memberId: uuidv4(), name: "" }); // Add new blank members if the number increased
      }
      return newMembers.slice(0, numMembers);  // Trim the array if the number decreased
    });
  }, [numMembers]);


  //------------------------------------------
  // Fetch group data (Edit existing group Mode)
  //-------------------------------------------

  // Function to fetch existing group data from the API
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
      const json = await res.json();
      const data: Group = json.data;

      // Set component state using fetched data, decoding names for safety (XSS prevention)
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
      router.push("/groups");   // Redirect on error
    } finally {
      setIsLoading(false);
    }
  };


  //-----------------------
  //Validation Functions
  //-----------------------

  // Validation function for group name
  const validateGroupName = useCallback((value: string) => {
    // Remove surrounding whitespace and standardise Unicode representation (NFC) for reliable storage.
    const normalizedValue = value.trim().normalize("NFC"); 
    const length = [...segmenter.segment(normalizedValue)].length;

    //check length of group name
    if (length > MAX_GROUP_NAME_LENGTH) {
      alert(`Group name cannot exceed ${MAX_GROUP_NAME_LENGTH} characters.`);
      return false;
    }

    //check allowed characters
    if (!allowedGroupRegex.test(normalizedValue)) {
      alert("Group name can only contain allowed characters.");
      return false;
    }
    return true;
  }, []);

  // Validation function for member name
  const validateMemberName = useCallback((value: string) => {
    // Remove surrounding whitespace and standardise Unicode representation (NFC) for reliable storage.
    const normalizedValue = value.trim().normalize("NFC");
    const length = [...segmenter.segment(normalizedValue)].length;

    //check length of member name
    if (length > MAX_NAME_LENGTH) {
      alert(`Member name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return false;
    }

    //check allowed characters
    if (!allowedNameRegex.test(normalizedValue)) {
      alert(
        "Member name can only contain letters, numbers, Japanese characters, and some emojis."
      );
      return false;
    }
    return true;
  }, []);

  // Handle group name input field
  const handleGroupNameChange = useCallback((value: string) => {
    setGroupName(value);
  }, []);

  // Handle member name input field
  const handleMemberNameChange = useCallback(
    (index: number, value: string) => {
      setMembers((prevMembers) => {
      const newMembers = [...prevMembers];
      newMembers[index] = { ...newMembers[index], name: value }; 
      return newMembers;
      });
    },[]
  );

  //-----------------------
  // From Submission 
  //------------------------

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

      // Get authorisation token
      const token = await getToken();
      if (!token) throw new Error("No authentication token found.");

      // Determine HTTP method and URL based on edit/create mode
      const method = groupId ? "PUT" : "POST";
      const url = groupId
        ? `${API_BASE_URL}/groups/${groupId}`
        : `${API_BASE_URL}/groups`;
      const body = { groupName, members,};  //Request body

      //Send API request
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        // Handle error response from the API
        const errorData = await res.json();
        throw new Error(
          `Failed to ${groupId ? "update" : "create"} group: ${
            errorData.message
          }`
        );
      }
      //Success: Alert user and navigate to the groups list page
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

  //-------------------
  // Main content
  //----------------------
  return (
    <div className="container mx-auto px-10 my-6 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 hand_font">
        {groupId ? "Edit Group" : "Create New Group"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3 text-base lg:text-xl ">
         {/* Group Name Input Field */}
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

        {/* Number of Members Select Dropdown */}
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
        
        {/* Rendered Member Name Inputs */}
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

         {/* Submit Button */}
        <button
          type="submit"
          className="px-4 py-2 lg:mt-6 bg-gray-600 hover:bg-gray-700 text-white rounded-md dark:border dark:border-gray-300"
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
