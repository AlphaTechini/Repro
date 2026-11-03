import { useT } from "@agent-native/core/client/i18n";
import { useSetPageTitle } from "@agent-native/toolkit/app-shell";
import {
  AccountSettingsCard,
  SettingsTabsPage,
  useAgentSettingsTabs,
} from "@agent-native/toolkit/app/settings";

import { IconBrandGithub } from "@tabler/icons-react";

import {
  GithubSettingsArea,
  githubSearchEntries,
} from "@/components/repro/settings/GithubSettingsArea";
import { APP_TITLE } from "@/lib/app-config";

import changelog from "../../CHANGELOG.md?raw";

export function meta() {
  return [{ title: `Settings - ${APP_TITLE}` }];
}

// Chat has no app rows here: core Preferences owns the interface language.
export default function SettingsRoute() {
  const t = useT();
  const agentSettingsTabs = useAgentSettingsTabs();
  useSetPageTitle(t("settings.title"));

  return (
    <SettingsTabsPage
      account={<AccountSettingsCard />}
      extraTabs={agentSettingsTabs}
      appAreas={[
        {
          id: "github",
          label: "GitHub", // i18n-ignore brand name
          icon: IconBrandGithub,
          content: <GithubSettingsArea />,
          keywords: "github repo repository issues auto-file required fields",
          searchEntries: githubSearchEntries,
        },
      ]}
      whatsNewMarkdown={changelog}
    />
  );
}
