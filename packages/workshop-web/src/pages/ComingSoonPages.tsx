import { Blueprint, Compass, Plugs, Stack } from '@phosphor-icons/react';

import ComingSoonPreview from '../components/ComingSoonPreview';
import MeshBackground from '../components/MeshBackground';

function Frosted({
  description,
  icon,
  title,
}: {
  description: string;
  icon: typeof Blueprint;
  title: string;
}) {
  return (
    <ComingSoonPreview icon={icon} title={title} description={description}>
      <div className="relative min-h-full">
        <MeshBackground />
      </div>
    </ComingSoonPreview>
  );
}

export function BlueprintsPage() {
  return (
    <Frosted
      icon={Blueprint}
      title="Blueprints"
      description="Blueprints are not in this workshop yet."
    />
  );
}

export function BlueprintDetailPage() {
  return (
    <Frosted
      icon={Blueprint}
      title="Blueprint"
      description="Blueprints are not in this workshop yet."
    />
  );
}

export function OutputsPage() {
  return (
    <Frosted icon={Stack} title="Outputs" description="Outputs are not in this workshop yet." />
  );
}

export function ExplorePage() {
  return (
    <Frosted icon={Compass} title="Explore" description="Explore is not in this workshop yet." />
  );
}

export function GatekeeperAppPage() {
  return (
    <Frosted
      icon={Plugs}
      title="Connector app"
      description="This connector has no management UI yet."
    />
  );
}
