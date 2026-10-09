import ExtensionDetail from '@/components/collector/ExtensionDetail'
export default async function ExtensionPage({params}:{params:Promise<{code:string}>}) { return <ExtensionDetail code={(await params).code} /> }
