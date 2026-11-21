"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import {
  inviteUser,
  cancelInvite,
  changeUserRole,
  revokeUserAccess,
  createRole,
  deleteRole,
  setRolePermissions,
} from "@/lib/data/access";
import { inviteUserSchema, changeRoleSchema, roleSchema } from "@/lib/validation/access";

export type UsersActionState = {
  error?: string;
};

const genericError: UsersActionState = { error: "Não foi possível concluir a ação. Tente novamente." };

async function requireUsersEdit() {
  const user = await getCurrentUser();
  const allowed = await hasPermission(user, "users", "edit");
  if (!allowed || !user) throw new Error("forbidden");
  return user;
}

export async function inviteUserAction(
  _prevState: UsersActionState,
  formData: FormData
): Promise<UsersActionState> {
  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    role_id: formData.get("role_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const user = await requireUsersEdit();
    await inviteUser(parsed.data.email, parsed.data.role_id, user.id);
  } catch {
    return genericError;
  }

  revalidatePath("/settings/users");
  return {};
}

export async function cancelInviteAction(email: string): Promise<UsersActionState> {
  try {
    await requireUsersEdit();
    await cancelInvite(email);
  } catch {
    return genericError;
  }
  revalidatePath("/settings/users");
  return {};
}

export async function changeUserRoleAction(
  _prevState: UsersActionState,
  formData: FormData
): Promise<UsersActionState> {
  const parsed = changeRoleSchema.safeParse({
    user_id: formData.get("user_id"),
    role_id: formData.get("role_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await requireUsersEdit();
    await changeUserRole(parsed.data.user_id, parsed.data.role_id);
  } catch {
    return genericError;
  }

  revalidatePath("/settings/users");
  return {};
}

export async function revokeUserAccessAction(userId: string, email: string): Promise<UsersActionState> {
  try {
    const current = await requireUsersEdit();
    if (current.id === userId) {
      return { error: "Você não pode revogar o próprio acesso." };
    }
    await revokeUserAccess(userId, email);
  } catch {
    return genericError;
  }
  revalidatePath("/settings/users");
  return {};
}

export async function createRoleAction(
  _prevState: UsersActionState,
  formData: FormData
): Promise<UsersActionState> {
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await requireUsersEdit();
    await createRole(parsed.data.name, parsed.data.description ?? null);
  } catch {
    return { error: "Não foi possível criar a função. O nome já pode estar em uso." };
  }

  revalidatePath("/settings/users");
  return {};
}

export async function deleteRoleAction(roleId: string, roleName: string): Promise<UsersActionState> {
  if (roleName === "admin_full_access") {
    return { error: "A função de acesso total não pode ser excluída." };
  }
  try {
    await requireUsersEdit();
    await deleteRole(roleId);
  } catch {
    return { error: "Não foi possível excluir — a função ainda está em uso por algum usuário ou convite." };
  }
  revalidatePath("/settings/users");
  return {};
}

export async function setRolePermissionsAction(
  roleId: string,
  roleName: string,
  permissionIds: string[]
): Promise<UsersActionState> {
  if (roleName === "admin_full_access") {
    return { error: "A função de acesso total sempre tem todas as permissões." };
  }
  try {
    await requireUsersEdit();
    await setRolePermissions(roleId, permissionIds);
  } catch {
    return genericError;
  }
  revalidatePath("/settings/users");
  return {};
}
