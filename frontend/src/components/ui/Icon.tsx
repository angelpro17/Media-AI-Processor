import type { SVGProps } from 'react'
import { IconName } from '@/types/ui'
import {
    AudioIcon, DocumentIcon, TranslateIcon, HomeIcon,
    UploadIcon, DownloadIcon, CheckIcon, XIcon, SpinnerIcon,
    LightningIcon, DiamondIcon, ArrowsIcon, PlayIcon, PauseIcon,
    CopyIcon, AlertIcon, PdfIcon, WordIcon, ImageIcon, WaveformIcon,
    ChevronRightIcon, MicIcon, VideoCameraIcon, ScissorsIcon,
    LayersIcon, CompressIcon, ScanIcon, ListIcon
} from '@/assets/icons/icons'

type IconMap = Record<IconName, React.FC<SVGProps<SVGSVGElement>>>

const ICONS: IconMap = {
    audio: AudioIcon,
    document: DocumentIcon,
    translate: TranslateIcon,
    home: HomeIcon,
    upload: UploadIcon,
    download: DownloadIcon,
    check: CheckIcon,
    x: XIcon,
    spinner: SpinnerIcon,
    lightning: LightningIcon,
    diamond: DiamondIcon,
    arrows: ArrowsIcon,
    play: PlayIcon,
    pause: PauseIcon,
    copy: CopyIcon,
    alert: AlertIcon,
    pdf: PdfIcon,
    word: WordIcon,
    image: ImageIcon,
    waveform: WaveformIcon,
    chevronRight: ChevronRightIcon,
    mic: MicIcon,
    videoCamera: VideoCameraIcon,
    scissors: ScissorsIcon,
    layers: LayersIcon,
    compress: CompressIcon,
    scan: ScanIcon,
    list: ListIcon,
}

interface IconProps extends SVGProps<SVGSVGElement> {
    name: IconName
    className?: string
}

export default function Icon({ name, className = 'w-5 h-5', ...rest }: IconProps) {
    const Component = ICONS[name]
    if (!Component) return null
    return <Component className={className} {...rest} />
}
