<script lang="ts">
  interface Props {
    name: string;
    badge: string;
    badgeClass?: string;
  }
  let { name, badge, badgeClass = 'badge-primary' }: Props = $props();
</script>

<div class="inline-flex items-center gap-2">
  <span class="font-medium">{name}</span>
  <span class="badge {badgeClass} badge-sm">{badge}</span>
</div>
