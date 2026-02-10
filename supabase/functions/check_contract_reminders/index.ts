import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Contract {
  id: string;
  supplier_name: string;
  end_date: string;
  aviso_previo: number;
  department_id: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  department_id: string | null;
}

interface NotificationSettings {
  user_id: string;
  email_enabled: boolean;
  reminder_days: number[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Fetch all contracts
    const contractsRes = await fetch(`${supabaseUrl}/rest/v1/contracts?status=eq.Ativo`, {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!contractsRes.ok) {
      throw new Error(`Failed to fetch contracts: ${contractsRes.statusText}`);
    }

    const contracts: Contract[] = await contractsRes.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check each contract for upcoming deadlines
    for (const contract of contracts) {
      const endDate = new Date(contract.end_date);
      const deadlineDate = new Date(endDate);
      deadlineDate.setDate(deadlineDate.getDate() - contract.aviso_previo);
      deadlineDate.setHours(0, 0, 0, 0);

      const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if today matches any reminder day
      const reminderDays = [90, 60, 30];
      for (const reminderDay of reminderDays) {
        if (daysUntilDeadline === reminderDay) {
          // Fetch admins and gestores for this department
          const usersRes = await fetch(
            `${supabaseUrl}/rest/v1/users?department_id=eq.${contract.department_id}`,
            {
              headers: {
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          const users: User[] = (await usersRes.json()).filter(
            (u: User) => u.role === "Super Admin" || u.role === "Gestor de Departamento"
          );

          // Create notifications for each user
          for (const user of users) {
            // Check notification settings
            const settingsRes = await fetch(
              `${supabaseUrl}/rest/v1/notification_settings?user_id=eq.${user.id}`,
              {
                headers: {
                  Authorization: `Bearer ${supabaseServiceRoleKey}`,
                  "Content-Type": "application/json",
                },
              }
            );

            const settings: NotificationSettings[] = await settingsRes.json();
            const userSettings = settings[0];

            if (userSettings && userSettings.reminder_days.includes(reminderDay)) {
              // Create in-app notification
              if (userSettings.email_enabled || userSettings.email_enabled === undefined) {
                const notifType = `contract_reminder_${reminderDay}`;
                const message = `${contract.supplier_name} vence em ${reminderDay} dias`;

                const existingRes = await fetch(
                  `${supabaseUrl}/rest/v1/notifications?user_id=eq.${user.id}&contract_id=eq.${contract.id}&type=eq.${notifType}`,
                  {
                    headers: {
                      Authorization: `Bearer ${supabaseServiceRoleKey}`,
                      "Content-Type": "application/json",
                    },
                  }
                );

                const existing = await existingRes.json();
                if (!existing || existing.length === 0) {
                  await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${supabaseServiceRoleKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      user_id: user.id,
                      contract_id: contract.id,
                      type: notifType,
                      message: message,
                      email_sent: false,
                    }),
                  });
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reminder check completed",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
