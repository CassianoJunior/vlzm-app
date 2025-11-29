import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { usePlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer } from '@/hooks/use-players'
import { CreatePlayerForm, EditPlayerForm } from '@/components/player-form'
import type { CreatePlayerFormData, UpdatePlayerFormData } from '@/schemas/player-schema'
import type { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Players() {
  const [page, setPage] = useState(1)
  const perPage = 20
  const { data: paged, isLoading, error } = usePlayers(page, perPage)
  const players = paged?.items ?? []
  const total = paged?.total ?? 0
  const createPlayer = useCreatePlayer()
  const updatePlayer = useUpdatePlayer()
  const deletePlayer = useDeletePlayer()

  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null)

  const filteredPlayers = players?.filter((player) =>
    player.surname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async (data: CreatePlayerFormData) => {
    try {
      await createPlayer.mutateAsync(data)
      toast.success('Player created successfully')
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create player:', error)
      toast.error('Failed to create player')
    }
  }

  const handleEdit = async (data: UpdatePlayerFormData) => {
    if (!selectedPlayer) return

    try {
      await updatePlayer.mutateAsync({
        id: selectedPlayer.id,
        ...data,
      })
      toast.success('Player updated successfully')
      setIsEditDialogOpen(false)
      setSelectedPlayer(null)
    } catch (error) {
      console.error('Failed to update player:', error)
      toast.error('Failed to update player')
    }
  }

  const handleDelete = async () => {
    if (!selectedPlayer) return

    try {
      await deletePlayer.mutateAsync(selectedPlayer.id)
      toast.success('Player deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedPlayer(null)
    } catch (error) {
      console.error('Failed to delete player:', error)
      toast.error('Failed to delete player')
    }
  }

  const openEditDialog = (player: Profile) => {
    setSelectedPlayer(player)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (player: Profile) => {
    setSelectedPlayer(player)
    setIsDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading players...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-destructive">Error loading players</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Button variant="ghost" asChild className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
        <Link to="/events">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Events
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-foreground">Players</h1>
          <Badge variant="secondary" className="ml-2">
            {total || 0}
          </Badge>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto min-h-11">
          <Plus className="mr-2 h-4 w-4" /> Add Player
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile view: Cards */}
      <div className="md:hidden space-y-4">
        {!filteredPlayers || filteredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No players found matching your search' : 'No players found'}
            </p>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <Card key={player.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{player.surname}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {player.sex === 'M' ? 'Male' : 'Female'}
                        </Badge>
                        <Badge 
                          variant={player.role === 'manager' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {player.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => openEditDialog(player)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => openDeleteDialog(player)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 mb-6">
        <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="min-h-11">
          Prev
        </Button>
        <div className="text-sm text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / perPage))}</div>
        <Button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / perPage)} className="min-h-11">
          Next
        </Button>
      </div>

      {/* Desktop view: Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>All Players</CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredPlayers || filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No players found matching your search' : 'No players found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.surname}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {player.sex === 'M' ? 'Male' : 'Female'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={player.role === 'manager' ? 'default' : 'secondary'}>
                        {player.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-9"
                          onClick={() => openEditDialog(player)}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="min-h-9"
                          onClick={() => openDeleteDialog(player)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Player Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
            <DialogDescription>
              Create a new player account. They will receive an email to confirm their account.
            </DialogDescription>
          </DialogHeader>
          <CreatePlayerForm onSubmit={handleCreate} isLoading={createPlayer.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update player information.
            </DialogDescription>
          </DialogHeader>
          {selectedPlayer && (
            <EditPlayerForm
              player={selectedPlayer}
              onSubmit={handleEdit}
              isLoading={updatePlayer.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedPlayer?.surname}</strong>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePlayer.isPending}
              className="min-h-11"
            >
              {deletePlayer.isPending ? 'Deleting...' : 'Delete Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
