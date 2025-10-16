/*
* Custom Hook: useGroupSelection
* This hook handles the state and logic for managing groups on the score sheet page.
* It fetches the logged-in user's available groups from the API and managing the currently selected group.
* Key Responsibilities:
* Authentication: Uses Clerk's `useAuth` to get a token , 
* Data Fetching:Retrieves the user's available groups from the API (/api/groups).
* State Management: Manages `availableGroups` and `selectedGroupId`.
* Group handler: initializing and updating the selected group ID based on user interaction or record loading.
*/

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { GroupData } from '../score-types.ts';


// API endpoint URL for group operations
const GROUP_API_BASE_URL = process.env.NEXT_PUBLIC_GROUP_API_BASE_URL  || "http://localhost:8080/api/groups";


export default function useGroupSelection() {
    const { userId, getToken } = useAuth();
    const [availableGroups, setAvailableGroups] = useState<GroupData[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);

    const fetchAvailableGroups = useCallback(async () => {
        if (!userId || !getToken) return;

        setIsLoadingGroups(true);
        try {
            const token = await getToken({ template: "long_lasting" });
            const response = await fetch(GROUP_API_BASE_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                //fetch whole response
                const result = await response.json();
                
                //fetch group array from data property
                const groups: GroupData[] = result.data || [];
                if (Array.isArray(groups)) {
                    setAvailableGroups(groups);
            } else {
                    // When the API response was not an array.
                    console.error("API returned non-array data for available groups:", result); 
                    setAvailableGroups([]);
            }
            } else {
                console.error("Failed to fetch available groups:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Error fetching available groups:", error);
        } finally {
            setIsLoadingGroups(false); 
        }
    }, [userId, getToken]);

    //Fetch available groups on initial load.
    useEffect(() => {
        fetchAvailableGroups();
    }, [fetchAvailableGroups]);

        //set group when a score sheet is loaded from a record
        const initializeSelectedGroup = useCallback((groupId: string | null) => {
            if (groupId) {
            // Check if ID exist in availableGroups
            const exists = availableGroups.some(g => g._id === groupId);
            if (exists) {
                setSelectedGroupId(groupId); // set the groupId if exist
            } else {
                // set null if the groupId doesn't exist 
                console.warn(`Attempted to initialize with invalid Group ID: ${groupId}. Resetting to null.`);
                setSelectedGroupId(null);
            }
        } else {
            setSelectedGroupId(null);
        }
    }, [availableGroups]);
    

    // group selection handler
    const handleGroupSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroupId = e.target.value === "" ? null : e.target.value;
        if (newGroupId === null || availableGroups.some(g => g._id === newGroupId)) {
        setSelectedGroupId(newGroupId);
    } else {
        console.warn(`Invalid group selection attempted: ${newGroupId}`);
        setSelectedGroupId(null);
    }
    }, [availableGroups]);

    const selectedGroup = availableGroups.find(g => g._id === selectedGroupId) || null;

    return {
        availableGroups,
        selectedGroupId,
        selectedGroup, 
        handleGroupSelect,
        initializeSelectedGroup,
        isGroupSelected: !!selectedGroupId,
        isLoadingGroups,
    };
}