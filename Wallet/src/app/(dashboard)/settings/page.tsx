import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountSection } from "./DeleteAccountSection";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, createdAt: true, passwordHash: true },
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, security, and data." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span className="text-foreground">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Email</span>
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Member since</span>
              <span className="text-foreground">
                {user?.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{user?.passwordHash ? "Change password" : "Set a password"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm hasPassword={!!user?.passwordHash} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export your data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted">
              Download everything you&apos;ve entered — income, expenses, EPF/PF, investments,
              goals, assets, and liabilities — as a single JSON file.
            </p>
            <a
              href="/api/account/export"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-surface-raised border border-border px-4 text-sm font-medium text-foreground hover:border-muted-2"
            >
              Download my data (JSON)
            </a>
          </CardContent>
        </Card>

        <Card className="border-negative/30">
          <CardHeader>
            <CardTitle className="text-negative">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteAccountSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
