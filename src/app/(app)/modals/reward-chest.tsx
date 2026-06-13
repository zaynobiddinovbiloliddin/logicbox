import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import RewardChest from "@/components/reward-chest";

export default function RewardChestModal() {
  const handleClaim = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <RewardChest onClaim={handleClaim} />
    </>
  );
}
