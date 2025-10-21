'use client';
import React, { useState, useEffect } from 'react';
import { DiceFiveIcon } from "@phosphor-icons/react";

const DiceInner = () => (
    <DiceFiveIcon size={70} className="text-green bounceIn" />
);

export default function DiceIcon() {
    // --- Dice Animation State and Constants---
    // Start from off-screen top
    const [diceY, setDiceY] = useState(-50); 
    const [velocity, setVelocity] = useState(0); 
    const [bounces, setBounces] = useState(0);

    const gravity = 0.5;
    const restitution = 0.7;
    // Set floor (ground) at 65% of screen height
    const floorY = 65; 
    const maxBounces = 3;

    useEffect(() => {
        let animationFrameId: number;

        const animate = () => {
            setDiceY(prevY => {
                let newY = prevY + velocity;
                let newVelocity = velocity + gravity;

                // Calculate fall and bounce
                if (newY >= floorY) {
                    newY = floorY;

                    if (bounces < maxBounces) {
                        // Handle bounce
                        newVelocity = -newVelocity * restitution; 
                        setBounces(prevBounces => prevBounces + 1);
                    } else {
                        // Update State and proceed to the next frame
                        newVelocity = 0;
                        cancelAnimationFrame(animationFrameId);
                    }
                }
                
                // Update State and proceed to the next frame
                setVelocity(newVelocity);
                return newY;
            });

            // Continue animation as long as velocity is not zero or remaining bounces are left
            if (velocity !== 0 || bounces < maxBounces) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        // Initial run
        animationFrameId = requestAnimationFrame(animate);

        // Cleanup function
        return () => cancelAnimationFrame(animationFrameId);
    }, [bounces, velocity]);

    return (
        <div 
            className="absolute top-0 right-50 -translate-x-1/2 w-16 h-16 -z-20" 
            style={{
                // Control Y position using State (in vh units)
                transform: `translate(-50%, ${diceY}vh)`, 
                transition: 'none', // Disable CSS transition as position is controlled by React
            }}
        >
            {/* Actual dice display part */}
            <DiceInner /> 
        </div>
    );
}
