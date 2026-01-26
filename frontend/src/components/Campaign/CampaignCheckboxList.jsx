import { Form } from "react-bootstrap";

const CampaignCheckboxList = ({ campaigns, selectedCampaigns, onChange }) => {
  return (
    <div className="campaign-checkbox-list">
      {campaigns.map((campaign) => (
        <Form.Check
          key={campaign._id}
          type="checkbox"
          label={campaign.name}
          value={campaign._id}
          checked={selectedCampaigns.includes(campaign._id)}
          onChange={(e) => onChange(campaign._id, e.target.checked)}
          className="mb-2"
        />
      ))}
    </div>
  );
};

export default CampaignCheckboxList;
