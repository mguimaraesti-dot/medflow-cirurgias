export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-sm text-slate-500">
        {message}
      </td>
    </tr>
  );
}
