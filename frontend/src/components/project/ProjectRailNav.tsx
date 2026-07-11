import { Box, Button, Divider, Stack, Typography } from "@mui/material";

type NavGroup = { slug: string; label: string; tabs: { slug: string; label: string }[] };

/**
 * Grouped vertical project section nav — lives in the glass rail so the stage
 * carries one panel at a time (no double horizontal tab bars).
 */
export function ProjectRailNav({
  groups,
  activeSlug,
  onSelect,
}: {
  groups: NavGroup[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <Stack
      component="nav"
      aria-label="Project sections"
      spacing={0.25}
      sx={{ width: 1, minWidth: 0 }}
    >
      {groups.map((group, gi) => (
        <Box key={group.slug}>
          {gi > 0 && <Divider sx={{ my: 1 }} />}
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ px: 0.5, display: "block", lineHeight: 1.4 }}
          >
            {group.label}
          </Typography>
          {group.tabs.map((tab) => {
            const selected = activeSlug === tab.slug;
            return (
              <Button
                key={tab.slug}
                variant={selected ? "contained" : "text"}
                color={selected ? "primary" : "inherit"}
                onClick={() => onSelect(tab.slug)}
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  minHeight: 36,
                  px: 1.5,
                  py: 0.75,
                  fontWeight: selected ? 600 : 400,
                  textTransform: "none",
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      ))}
    </Stack>
  );
}
