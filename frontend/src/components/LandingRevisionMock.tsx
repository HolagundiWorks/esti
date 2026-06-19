/**
 * Static revision-flow preview — Carbon Form, Select, Checkbox, InlineNotification.
 */
import {
  Checkbox,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tag,
} from "@carbon/react";

export function LandingRevisionMock() {
  return (
    <Form aria-hidden>
      <Stack gap={5}>
        <h4>Transition: Client instruction — facade material from brick to ACM cladding</h4>
        <Stack gap={4}>
          <Stack orientation="horizontal" gap={3}>
            <p>Current state</p>
            <Tag type="blue" size="sm">
              Client review
            </Tag>
          </Stack>
          <Select id="lp-revision-move" labelText="Move to" defaultValue="accepted" disabled>
            <SelectItem value="accepted" text="Accepted" />
            <SelectItem value="rejected" text="Rejected" />
          </Select>
          <InlineNotification
            kind="warning"
            title="Major revision"
            subtitle="This instruction is classified MAJOR. Accepting it may affect programme, fee recovery and the next GFC issue — confirm before the drawing register advances."
            hideCloseButton
            lowContrast
          />
          <Checkbox
            id="lp-revision-confirm"
            labelText="I confirm this major design revision has been reviewed and accepted on behalf of the practice."
            disabled
          />
        </Stack>
      </Stack>
    </Form>
  );
}
