'use client';
import React, { useState, useEffect } from 'react';
import { DiceFiveIcon } from "@phosphor-icons/react";

const DiceInner = () => (
    <DiceFiveIcon size={70} className="text-green bounceIn" />
);

export default function DiceIcon() {
    // --- 🎲 サイコロのアニメーション Stateと定数 ---
    // 画面外上部からスタート
    const [diceY, setDiceY] = useState(-50); 
    const [velocity, setVelocity] = useState(0); 
    const [bounces, setBounces] = useState(0);

    const gravity = 0.5;
    const restitution = 0.7;
    // 画面の高さの 75% の位置を床とする
    const floorY = 65; 
    const maxBounces = 3;

    useEffect(() => {
        let animationFrameId: number;

        const animate = () => {
            setDiceY(prevY => {
                let newY = prevY + velocity;
                let newVelocity = velocity + gravity;

                // 🚀 落下・バウンドの計算
                if (newY >= floorY) {
                    newY = floorY;

                    if (bounces < maxBounces) {
                        // バウンド処理
                        newVelocity = -newVelocity * restitution; 
                        setBounces(prevBounces => prevBounces + 1);
                    } else {
                        // 最大バウンド回数に達したら停止
                        newVelocity = 0;
                        cancelAnimationFrame(animationFrameId);
                    }
                }
                
                // Stateを更新し、次フレームへ
                setVelocity(newVelocity);
                return newY;
            });

            // 速度がゼロでない、またはバウンド回数が残っている間はアニメーションを継続
            if (velocity !== 0 || bounces < maxBounces) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        // 初回実行
        animationFrameId = requestAnimationFrame(animate);

        // クリーンアップ関数
        return () => cancelAnimationFrame(animationFrameId);
    }, [bounces, velocity]);

    return (
        <div 
            className="absolute top-0 right-50 -translate-x-1/2 w-16 h-16 -z-20" 
            style={{
                // Y位置を State で制御 (vh単位)
                transform: `translate(-50%, ${diceY}vh)`, 
                transition: 'none', // Reactで位置を制御するためCSSトランジションは無効
            }}
        >
            {/* 実際のDiceの表示部分 */}
            <DiceInner /> 
        </div>
    );
}
