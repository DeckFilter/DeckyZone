import { DialogBody, DialogControlsSection, Field } from '@decky/ui'
import SettingsDialogSubHeader from '../components/SettingsDialogSubHeader'

type ProductSpecification = {
  label: string
  value: string
}

type ProductSpecificationSection = {
  title: string
  specifications: readonly ProductSpecification[]
}

const productSpecificationSections: readonly ProductSpecificationSection[] = [
  {
    title: 'Computing System',
    specifications: [
      {
        label: 'Processor',
        value: 'AMD Ryzen 7 8840U 8-core / 16-thread, 3.3GHz up to 5.1GHz',
      },
      { label: 'TDP', value: '8W - 28W' },
      { label: 'System Memory', value: '16GB LPDDR5X 7500MHz (onboard)' },
    ],
  },
  {
    title: 'Graphics',
    specifications: [
      {
        label: 'Graphic Engine',
        value: 'AMD Radeon™ 780M Graphics 12 Core, up to 2.7GHz',
      },
      { label: 'Video Output', value: 'DP via USB4' },
    ],
  },
  {
    title: 'Display',
    specifications: [
      { label: 'Type', value: 'AMOLED' },
      { label: 'Size', value: '7-inch' },
      { label: 'Resolution', value: '1920x1080 (FHD)' },
      { label: 'Aspect Ratio', value: '16:9' },
      { label: 'Brightness', value: '800nits' },
      { label: 'Contrast', value: '100,000:1 to 1,000,000:1' },
      { label: 'Refresh Rate', value: '120Hz' },
      { label: 'HDR Ready', value: 'Yes' },
      { label: 'Touch', value: 'Capacitive 10-point multi-touch' },
    ],
  },
  {
    title: 'Storage',
    specifications: [
      { label: 'M.2', value: '512GB M.2 NVMe PCIe 4.0 x4 SSD (2280)' },
      { label: 'Card Reader', value: 'UHS-II microSD' },
    ],
  },
  {
    title: 'I/O Ports',
    specifications: [
      {
        label: 'Audio',
        value: '3.5mm Stereo analog audio\nStereo speaker system\nBuilt-in microphone',
      },
      { label: 'USB', value: '2 x USB4' },
      { label: 'Camera', value: '1.0MP, 1280x720 front camera' },
      { label: 'WiFi', value: 'WiFi 6E' },
      { label: 'Bluetooth', value: 'Bluetooth 5.2' },
    ],
  },
  {
    title: 'Mechanical',
    specifications: [
      {
        label: 'Control and Input',
        value: [
          'Power button with fingerprint reader',
          'Vol +/- buttons',
          'ABXY buttons',
          'D-pad',
          'L&R Hall Effect Triggers',
          '2 x 2-stage Adjustable Trigger switch',
          '2 x Hall Effect Thumbsticks',
          '2 x Radial Dials',
          'L & R bumpers',
          '2 x Trackpads',
          'View button',
          'Option button',
          'More button',
          'Home button',
          'ZONE button',
          '2 x Programmable Grip buttons',
          'Haptic Feedback',
          '6-axis gyro',
          '1 x Lanyard Tie-point',
        ].join('\n'),
      },
      { label: 'Cooling', value: 'Active' },
      { label: 'RGB', value: 'Yes' },
      { label: 'Dimensions', value: '285 x 115 x 35 mm' },
      { label: 'Weight', value: '692g / 1.53lbs' },
      { label: 'Battery', value: '48.5Wh, 3-cell Li-ion' },
      {
        label: 'Power Supply',
        value: 'Type C Adapter Output: 20V@3.25A, 65W\nInput: 100~240V AC 50~60Hz',
      },
    ],
  },
  {
    title: 'Available SKU',
    specifications: [
      { label: 'Available SKU', value: 'ZGC-G1A1W-01' },
    ],
  },
]

const ProductSpecificationRow = ({
  label,
  value,
  isLast,
}: ProductSpecification & { isLast: boolean }) => {
  return (
    <Field
      focusable
      label={label}
      bottomSeparator={isLast ? 'none' : 'standard'}
      inlineWrap="keep-inline"
    >
      <span
        style={{
          display: 'block',
          overflowWrap: 'anywhere',
          textAlign: 'right',
          whiteSpace: 'pre-line',
        }}
      >
        {value}
      </span>
    </Field>
  )
}

const ProductSpecificationsPage = () => {
  return (
    <DialogBody>
      {productSpecificationSections.map((section) => (
        <DialogControlsSection key={section.title}>
          <SettingsDialogSubHeader>{section.title}</SettingsDialogSubHeader>
          {section.specifications.map((specification, index) => (
            <ProductSpecificationRow
              key={specification.label}
              {...specification}
              isLast={index === section.specifications.length - 1}
            />
          ))}
        </DialogControlsSection>
      ))}
    </DialogBody>
  )
}

export default ProductSpecificationsPage
