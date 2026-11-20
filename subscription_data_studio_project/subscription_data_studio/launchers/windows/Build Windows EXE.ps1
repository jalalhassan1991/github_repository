$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.Diagnostics;
using System.IO;

public static class SyntheticGeneratorLauncher
{
    [STAThread]
    public static void Main()
    {
        string page = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "subscription_data_studio.html");
        if (!File.Exists(page))
        {
            System.Windows.Forms.MessageBox.Show(
                "The generator HTML file is missing from this folder.",
                "Synthetic Subscription Generator",
                System.Windows.Forms.MessageBoxButtons.OK,
                System.Windows.Forms.MessageBoxIcon.Error);
            return;
        }
        Process.Start(new ProcessStartInfo(page) { UseShellExecute = true });
    }
}
'@
$output = Join-Path $PSScriptRoot 'SyntheticSubscriptionGenerator.exe'
Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly $output -OutputType WindowsApplication -ReferencedAssemblies 'System.Windows.Forms.dll'
Write-Host "Built: $output"
