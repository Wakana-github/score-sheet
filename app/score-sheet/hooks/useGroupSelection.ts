import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { GroupData } from '../score-types.ts';


// API endpoint URL for group operations
const GROUP_API_BASE_URL = process.env.NEXT_PUBLIC_GROUP_API_BASE_URL  || "http://localhost:8080/api/groups";


export default function useGroupSelection() {
    const { userId, getToken } = useAuth();
    const [availableGroups, setAvailableGroups] = useState<GroupData[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const fetchAvailableGroups = useCallback(async () => {
        if (!userId || !getToken) return;

        try {
            const token = await getToken({ template: "long_lasting" });
            const response = await fetch(GROUP_API_BASE_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const groups: GroupData[] = await response.json();
                setAvailableGroups(groups);
            } else {
                console.error("Failed to fetch available groups:", response.status);
            }
        } catch (error) {
            console.error("Error fetching available groups:", error);
        }
    }, [userId, getToken]);

    // 初期化時にグループを取得
    useEffect(() => {
        fetchAvailableGroups();
    }, [fetchAvailableGroups]);

    // ハンドラ
    const handleGroupSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroupId = e.target.value === "" ? null : e.target.value;
        setSelectedGroupId(newGroupId);
    }, []);

    const selectedGroup = availableGroups.find(g => g._id === selectedGroupId) || null;

    return {
        availableGroups,
        selectedGroupId,
        selectedGroup, 
        handleGroupSelect,
        isGroupSelected: !!selectedGroupId,
    };
}