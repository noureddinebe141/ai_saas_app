"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";

import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";

// CREATE
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase();

    const newUser = await User.create(user);

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
  }
}

// READ + AUTO CREATE IF NOT EXISTS
export async function getUserById(userId: string) {
  try {
    await connectToDatabase();

    let user = await User.findOne({ clerkId: userId });

    if (!user) {
      // جلب بيانات المستخدم من Clerk
      const clerkUser = await currentUser();

      if (!clerkUser) throw new Error("User not found in Clerk");

      // إنشاء المستخدم الجديد في قاعدة البيانات
      user = await User.create({
        clerkId: clerkUser.id,
        name: clerkUser.firstName || "Anonymous",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        avatar: clerkUser.imageUrl,
        creditBalance: 10, // رصيد افتراضي كبداية
      });
    }

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });

    if (!updatedUser) throw new Error("User update failed");

    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
  }
}

// DELETE
export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase();

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new Error("User not found");
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
  }
}

// USE CREDITS
export async function updateCredits(userId: string, creditFee: number) {
  try {
    await connectToDatabase();

    const updatedUserCredits = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { creditBalance: creditFee } },
      { new: true }
    );

    if (!updatedUserCredits) throw new Error("User credits update failed");

    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    handleError(error);
  }
}
