import { RadioGroup } from "@baydar/ui-web";

const noop = (): void => undefined;

const visibility = [
  { value: "public", label: "للجميع", description: "يظهر منشورك لكل من على بيدر وخارجها." },
  { value: "connections", label: "لاتصالاتي فقط", description: "يظهر لمن تواصلت معهم فقط." },
  { value: "private", label: "لي وحدي", description: "لن يظهر لأحد غيرك." },
];

export const Default = () => (
  <div style={{ maxWidth: 420 }}>
    <RadioGroup
      items={visibility}
      value="public"
      onValueChange={noop}
      legend="من يمكنه رؤية المنشور؟"
    />
  </div>
);

export const WithDisabledItem = () => (
  <div style={{ maxWidth: 420 }}>
    <RadioGroup
      legend="نوع الدوام"
      value="full"
      onValueChange={noop}
      items={[
        { value: "full", label: "دوام كامل" },
        { value: "part", label: "دوام جزئي" },
        { value: "contract", label: "عقد مؤقت", disabled: true },
      ]}
    />
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 420 }}>
    <RadioGroup
      legend="سبب الإبلاغ"
      value=""
      onValueChange={noop}
      error
      errorMessage="اختر سببًا قبل إرسال البلاغ."
      items={[
        { value: "spam", label: "محتوى مزعج" },
        { value: "harassment", label: "إساءة أو تحرّش" },
        { value: "fake", label: "حساب مزيّف" },
      ]}
    />
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 420 }}>
    <RadioGroup
      items={visibility}
      value="connections"
      onValueChange={noop}
      legend="من يمكنه رؤية المنشور؟"
      disabled
    />
  </div>
);
