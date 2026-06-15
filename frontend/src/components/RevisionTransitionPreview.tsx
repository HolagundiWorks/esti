/**
 * Static preview of the CRIF transition modal (ProjectOverview) for the marketing landing.
 * Matches the Major/Critical acknowledgement panel shown when accepting a scoped revision.
 */
import {
  Button,
  Checkbox,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tag,
} from "@carbon/react";
import { DECISION_STATE_LABEL, DECISION_STATE_TAG } from "@esti/contracts";

const DEMO_TITLE = "Switch facade material from brick to ACM cladding";

export function RevisionTransitionPreview() {
  return (
    <div className="esti-lp-criff-panel" aria-hidden>
      <div className="esti-lp-criff-modal">
        <div className="esti-lp-criff-modal-header">
          <h3>{`Transition: ${DEMO_TITLE}`}</h3>
        </div>
        <div className="esti-lp-criff-modal-body">
          <Stack gap={5}>
            <p>
              Current state:{" "}
              <Tag type={DECISION_STATE_TAG.CLIENT_REVIEW} size="sm">
                {DECISION_STATE_LABEL.CLIENT_REVIEW}
              </Tag>
            </p>
            <Select
              id="lp-tr-tostate"
              labelText="Move to"
              value="ACCEPTED"
              onChange={() => {}}
            >
              <SelectItem value="ACCEPTED" text={DECISION_STATE_LABEL.ACCEPTED} />
              <SelectItem value="REJECTED" text={DECISION_STATE_LABEL.REJECTED} />
            </Select>
            <InlineNotification
              kind="warning"
              title="Major/Critical revision"
              subtitle="This decision is categorised as MAJOR. Accepting it may affect the project timeline, cost, or scope."
              hideCloseButton
              lowContrast
            />
            <Checkbox
              id="lp-tr-ack"
              labelText="I acknowledge this major/critical design revision has been reviewed and accepted."
              checked={false}
            />
          </Stack>
        </div>
        <div className="esti-lp-criff-modal-footer">
          <Button kind="secondary" size="md">
            Cancel
          </Button>
          <Button kind="primary" size="md" disabled>
            Confirm transition
          </Button>
        </div>
      </div>
    </div>
  );
}
